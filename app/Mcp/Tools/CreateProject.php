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
use Laravel\Mcp\Server\Tools\Annotations\IsDestructive;
use Laravel\Mcp\Server\Tools\Annotations\IsOpenWorld;

#[Name('create_project')]
#[Description('Create an empty local Webcanvas project. Returns its ID, revision, and state for subsequent updates.')]
#[IsDestructive(false)]
#[IsOpenWorld(false)]
class CreateProject extends Tool
{
    public function handle(Request $request): ResponseFactory
    {
        $data = $request->validate(['name' => 'required|string|max:120']);
        $project = Project::create($data + ['screens' => [], 'items' => [], 'viewport' => ['x' => 100, 'y' => 140, 'zoom' => 0.6]]);

        return Response::structured(['project' => $project->fresh()->toArray()]);
    }

    /** @return array<string, Type> */
    public function schema(JsonSchema $schema): array
    {
        return ['name' => $schema->string()->max(120)->required()];
    }
}
