<?php

namespace Tests\Feature;

use App\Models\Project;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class CanvasItemTest extends TestCase
{
    use RefreshDatabase;

    public function test_items_styles_and_layer_order_survive_reopening_a_canvas(): void
    {
        $this->post('/projects', ['name' => 'Ideas'])->assertRedirect();
        $project = Project::firstOrFail();
        $items = array_map(fn (string $kind): array => [
            'id' => (string) Str::uuid(), 'kind' => $kind, 'x' => 50, 'y' => -60,
            'width' => 240, 'height' => 240, 'zIndex' => 2, 'content' => "First line\nSecond line",
            'color' => '#fef08a', 'filled' => false, 'fontSize' => 24, 'src' => null,
        ], ['note', 'text', 'square', 'rectangle', 'triangle', 'circle']);
        $screen = ['id' => (string) Str::uuid(), 'title' => 'Screen', 'url' => null, 'x' => 0, 'y' => 0, 'width' => 1440, 'height' => 900, 'zIndex' => 1];
        $this->patchJson("/projects/{$project->id}", ['items' => $items, 'screens' => [$screen]])->assertOk();
        $this->assertSame($items, $project->fresh()->items);
        $this->get("/projects/{$project->id}")->assertInertia(fn (Assert $page) => $page
            ->component('Canvas')->has('project.items', 6)->where('project.items.0.color', '#fef08a')
            ->where('project.items.2.filled', false)->where('project.screens.0.zIndex', 1));
        $this->patchJson("/projects/{$project->id}", ['items' => []])->assertOk();
        $this->assertSame([], $project->fresh()->items);
        $this->assertCount(1, $project->fresh()->screens);
    }

    public function test_shape_labels_and_translucent_fill_persist_and_validate(): void
    {
        $this->post('/projects', ['name' => 'Boards'])->assertRedirect();
        $project = Project::firstOrFail();
        $shape = ['id' => (string) Str::uuid(), 'kind' => 'rectangle', 'x' => 0, 'y' => 0, 'width' => 20000, 'height' => 12000, 'zIndex' => 0, 'color' => '#3b82f6', 'filled' => true, 'fillStyle' => 'translucent', 'label' => 'Research', 'fontSize' => 24];
        $this->patchJson("/projects/{$project->id}", ['items' => [$shape]])->assertOk();
        $this->get("/projects/{$project->id}")->assertInertia(fn (Assert $page) => $page
            ->component('Canvas')->where('project.items.0.fillStyle', 'translucent')->where('project.items.0.label', 'Research')->where('project.items.0.width', 20000)->where('project.items.0.height', 12000));
        $shape['fillStyle'] = 'invalid';
        $shape['label'] = str_repeat('a', 121);
        $this->patchJson("/projects/{$project->id}", ['items' => [$shape]])->assertUnprocessable()
            ->assertJsonValidationErrors(['items.0.fillStyle', 'items.0.label']);
        $this->assertSame('Research', $project->fresh()->items[0]['label']);
        $shape['fillStyle'] = 'outline';
        $shape['filled'] = false;
        $shape['label'] = '';
        $this->patchJson("/projects/{$project->id}", ['items' => [$shape]])->assertOk();
        $this->assertNull($project->fresh()->items[0]['label']);
    }

    public function test_invalid_items_do_not_overwrite_saved_content(): void
    {
        $this->post('/projects', ['name' => 'Ideas'])->assertRedirect();
        $project = Project::firstOrFail();
        $item = ['id' => (string) Str::uuid(), 'kind' => 'image', 'x' => 0, 'y' => 0, 'width' => 240, 'height' => 240, 'zIndex' => 0, 'color' => '#ffffff', 'filled' => true, 'fontSize' => 24, 'src' => 'javascript:alert(1)'];
        $this->patchJson("/projects/{$project->id}", ['items' => [$item]])->assertUnprocessable()->assertJsonValidationErrors('items.0.src');
        $item['src'] = null;
        $this->patchJson("/projects/{$project->id}", ['items' => [$item]])->assertUnprocessable()->assertJsonValidationErrors('items.0.src');
        $item['kind'] = 'note';
        $item['color'] = 'invalid';
        $this->patchJson("/projects/{$project->id}", ['items' => [$item]])->assertUnprocessable()->assertJsonValidationErrors('items.0.color');
        $this->assertSame([], $project->fresh()->items);
    }

    public function test_images_upload_and_are_served_only_from_their_project(): void
    {
        Storage::fake('local');
        $this->post('/projects', ['name' => 'Images'])->assertRedirect();
        $project = Project::firstOrFail();
        $file = UploadedFile::fake()->image('photo.png', 600, 400);
        $response = $this->post("/projects/{$project->id}/images", ['image' => $file], ['Accept' => 'application/json'])
            ->assertCreated()->assertJsonPath('width', 600)->assertJsonPath('height', 400);
        $src = $response->json('src');
        $this->get($src)->assertOk()->assertHeader('X-Content-Type-Options', 'nosniff');
        Storage::disk('local')->assertExists("projects/{$project->id}/images/".basename($src));
        $item = ['id' => (string) Str::uuid(), 'kind' => 'image', 'x' => 0, 'y' => 0, 'width' => 600, 'height' => 400, 'zIndex' => 0, 'color' => '#ffffff', 'filled' => true, 'fontSize' => 24, 'src' => $src];
        $this->patchJson("/projects/{$project->id}", ['items' => [$item]])->assertOk();
        $this->assertSame($src, $project->fresh()->items[0]['src']);
        $this->post('/projects', ['name' => 'Other'])->assertRedirect();
        $other = Project::latest('id')->firstOrFail();
        $this->get("/projects/{$other->id}/images/".basename($src))->assertNotFound();
        $this->patchJson("/projects/{$other->id}", ['items' => [$item]])->assertUnprocessable();
        $this->post("/projects/{$project->id}/images", ['image' => UploadedFile::fake()->create('bad.svg', 1, 'image/svg+xml')], ['Accept' => 'application/json'])->assertUnprocessable();
    }
}
