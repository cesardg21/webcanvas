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

#[Name('get_project')]
#[Description('Read a project with all screens, items, positions, sizes, styling, links, viewport, and its current revision. Read before editing.')]
#[IsReadOnly]
#[IsOpenWorld(false)]
class GetProject extends Tool
{
    public function handle(Request $request): Response|ResponseFactory
    {
        $data = $request->validate(['project_id' => 'required|integer|min:1']);
        $project = Project::find($data['project_id']);

        return $project ? Response::structured(['project' => $project->toArray()]) : Response::error('Project not found.');
    }

    /** @return array<string, Type> */
    public function schema(JsonSchema $schema): array
    {
        return ['project_id' => $schema->integer()->min(1)->required()];
    }
}
