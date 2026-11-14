<?php

namespace Tests\Feature;

use App\Models\Project;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ProjectTest extends TestCase
{
    use RefreshDatabase;

    public function test_release_metadata_only_marks_local_environment(): void
    {
        config(['app.version' => '0.2.0', 'app.build' => '42']);

        foreach (['local' => true, 'production' => false, 'staging' => false] as $environment => $isLocal) {
            config(['app.env' => $environment]);
            $this->get('/')->assertInertia(fn (Assert $page) => $page
                ->component('Projects')
                ->where('release.version', '0.2.0')
                ->where('release.build', '42')
                ->where('release.isLocal', $isLocal));
        }
    }

    public function test_project_lifecycle_and_canvas_persistence(): void
    {
        $this->post('/projects', ['name' => 'Research'])->assertRedirect();
        $project = Project::firstOrFail();
        $this->assertSame([], $project->screens);
        $screen = ['id' => (string) Str::uuid(), 'title' => 'Example', 'url' => 'https://example.com', 'x' => -300, 'y' => 200, 'width' => 1440, 'height' => 900];
        $this->patchJson("/projects/{$project->id}", ['screens' => [$screen], 'viewport' => ['x' => 12, 'y' => -45, 'zoom' => .5]])->assertOk();
        $this->get("/projects/{$project->id}")->assertInertia(fn (Assert $page) => $page->component('Canvas')->has('project.screens', 1)->where('project.screens.0.width', 1440)->where('project.viewport.zoom', .5));
        $this->patchJson("/projects/{$project->id}", ['name' => 'Updated', 'screens' => []])->assertOk();
        $this->assertSame([], $project->fresh()->screens);
        $this->assertSame('Updated', $project->fresh()->name);
        $this->delete("/projects/{$project->id}")->assertRedirect('/');
        $this->assertDatabaseCount('projects', 0);
    }

    public function test_invalid_screens_do_not_overwrite_saved_state(): void
    {
        $project = Project::create(['name' => 'Test', 'screens' => [], 'viewport' => ['x' => 0, 'y' => 0, 'zoom' => 1]]);
        $screen = ['id' => (string) Str::uuid(), 'title' => 'Bad URL', 'url' => 'javascript:alert(1)', 'x' => 0, 'y' => 0, 'width' => 1440, 'height' => 900];
        $this->patchJson("/projects/{$project->id}", ['screens' => [$screen]])->assertUnprocessable()->assertJsonValidationErrors('screens.0.url');
        $this->patchJson("/projects/{$project->id}", ['viewport' => ['x' => 0, 'y' => 0, 'zoom' => 0]])->assertUnprocessable();
        $this->assertSame([], $project->fresh()->screens);
        $this->assertEquals(1, $project->fresh()->viewport['zoom']);
    }

    public function test_blank_screens_can_be_saved_and_duplicate_ids_are_rejected(): void
    {
        $project = Project::create(['name' => 'Test', 'screens' => [], 'viewport' => ['x' => 0, 'y' => 0, 'zoom' => 1]]);
        $screen = ['id' => (string) Str::uuid(), 'title' => 'Blank', 'url' => '', 'x' => 0, 'y' => 0, 'width' => 1440, 'height' => 900];
        $this->patchJson("/projects/{$project->id}", ['screens' => [$screen]])->assertOk();
        $this->patchJson("/projects/{$project->id}", ['screens' => [$screen, $screen]])->assertUnprocessable();
        $this->assertCount(1, $project->fresh()->screens);
    }

    public function test_link_groups_and_independent_sizes_survive_save_and_unlink(): void
    {
        $this->post('/projects', ['name' => 'Responsive views'])->assertRedirect();
        $project = Project::firstOrFail();
        $group = (string) Str::uuid();
        $desktop = ['id' => (string) Str::uuid(), 'title' => 'Example', 'url' => 'https://example.com', 'x' => 0, 'y' => 0, 'width' => 1440, 'height' => 900, 'linkGroup' => $group];
        $phone = array_replace($desktop, ['id' => (string) Str::uuid(), 'x' => 1520, 'width' => 375, 'height' => 812]);
        $this->patchJson("/projects/{$project->id}", ['screens' => [$desktop, $phone]])->assertOk();
        $this->assertSame([$desktop, $phone], $project->fresh()->screens);
        $phone['linkGroup'] = null;
        $this->patchJson("/projects/{$project->id}", ['screens' => [$desktop, $phone]])->assertOk();
        $this->assertNull($project->fresh()->screens[1]['linkGroup']);
        $phone['linkGroup'] = 'invalid-group';
        $this->patchJson("/projects/{$project->id}", ['screens' => [$desktop, $phone]])->assertUnprocessable()->assertJsonValidationErrors('screens.1.linkGroup');
        $this->assertNull($project->fresh()->screens[1]['linkGroup']);
    }
}
