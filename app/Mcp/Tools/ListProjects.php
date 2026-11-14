<?php

namespace App\Mcp\Tools;

use App\Models\Project;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\JsonSchema\Types\Type;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\ResponseFactory;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Tool;
use Laravel\Mcp\Server\Tools\Annotations\IsOpenWorld;
use Laravel\Mcp\Server\Tools\Annotations\IsReadOnly;

#[Name('list_projects')]
#[Description('List local Webcanvas projects with IDs, names, item counts, and revisions. Paginated by ID; pass next_after_id to continue.')]
#[IsReadOnly]
#[IsOpenWorld(false)]
class ListProjects extends Tool
{
    public function handle(Request $request): ResponseFactory
    {
        $data = $request->validate(['after_id' => 'sometimes|integer|min:0']);
        $projects = Project::where('id', '>', $data['after_id'] ?? 0)->orderBy('id')->limit(51)->get();
        $page = $projects->take(50);

        return Response::structured([
            'projects' => $page->map(fn (Project $project): array => [
                'id' => $project->id, 'name' => $project->name, 'revision' => $project->revision,
                'screens' => count($project->screens), 'items' => count($project->items ?? []),
            ])->values()->all(),
            'next_after_id' => $projects->count() > 50 ? $page->last()->id : null,
        ]);
    }

    /** @return array<string, Type> */
    public function schema(JsonSchema $schema): array
    {
        return ['after_id' => $schema->integer()->min(0)];
    }
}
