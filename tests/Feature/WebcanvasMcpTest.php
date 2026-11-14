<?php

namespace Tests\Feature;

use App\Mcp\Servers\WebcanvasServer;
use App\Mcp\Tools\CreateProject;
use App\Mcp\Tools\GetProject;
use App\Mcp\Tools\ListProjects;
use App\Mcp\Tools\UpdateProject;
use App\Models\Project;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class WebcanvasMcpTest extends TestCase
{
    use RefreshDatabase;

    public function test_tools_create_discover_and_read_projects(): void
    {
        WebcanvasServer::tool(CreateProject::class, ['name' => 'MCP canvas'])
            ->assertOk()->assertStructuredContentPath('project.revision', 0);
        $project = Project::firstOrFail();
        WebcanvasServer::tool(ListProjects::class)->assertOk()
            ->assertStructuredContentPath('projects.0.id', $project->id);
        WebcanvasServer::tool(GetProject::class, ['project_id' => $project->id])
            ->assertOk()->assertStructuredContentPath('project.name', 'MCP canvas');
    }

    public function test_mcp_edits_persist_and_stale_clients_cannot_overwrite_them(): void
    {
        WebcanvasServer::tool(CreateProject::class, ['name' => 'Test'])->assertOk();
        $project = Project::firstOrFail();
        $screen = ['id' => (string) Str::uuid(), 'title' => 'Example', 'url' => 'https://example.com', 'x' => 0, 'y' => 0, 'width' => 1440, 'height' => 900];
        WebcanvasServer::tool(UpdateProject::class, ['project_id' => $project->id, 'revision' => 0, 'screens' => [$screen]])
            ->assertOk()->assertStructuredContentPath('project.revision', 1);
        $this->assertSame([$screen], $project->fresh()->screens);
        WebcanvasServer::tool(UpdateProject::class, ['project_id' => $project->id, 'revision' => 0, 'name' => 'Stale'])
            ->assertHasErrors();
        $this->patchJson("/projects/{$project->id}", ['revision' => 0, 'screens' => []])->assertStatus(409);
        $this->getJson("/projects/{$project->id}/state")->assertOk()->assertJsonPath('project.revision', 1)->assertJsonPath('project.screens.0.id', $screen['id']);
        $this->patchJson("/projects/{$project->id}", ['revision' => 1, 'name' => 'Fresh'])->assertOk()->assertJsonPath('revision', 2);
        $this->assertSame([$screen], $project->fresh()->screens);
        WebcanvasServer::tool(UpdateProject::class, ['project_id' => $project->id, 'revision' => 2, 'screens' => []])
            ->assertOk()->assertStructuredContentPath('project.screens', []);
    }

    public function test_invalid_tool_updates_preserve_saved_state(): void
    {
        WebcanvasServer::tool(CreateProject::class, ['name' => 'Test'])->assertOk();
        $project = Project::firstOrFail();
        $screen = ['id' => (string) Str::uuid(), 'title' => 'Unsafe', 'url' => 'javascript:alert(1)', 'x' => 0, 'y' => 0, 'width' => 1440, 'height' => 900];
        WebcanvasServer::tool(UpdateProject::class, ['project_id' => $project->id, 'revision' => 0, 'screens' => [$screen]])->assertHasErrors();
        $this->assertSame([], $project->fresh()->screens);
        $this->assertSame(0, $project->fresh()->revision);
        WebcanvasServer::tool(GetProject::class, ['project_id' => 999])->assertHasErrors();
    }
}
