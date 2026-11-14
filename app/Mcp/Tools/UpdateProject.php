<?php

namespace App\Mcp\Tools;

use App\Models\Project;
use App\Support\CanvasData;
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

#[Name('update_project')]
#[Description('Edit a canvas using its current revision from get_project. Supplied screens/items arrays REPLACE those arrays: preserve unchanged objects, append to add, omit an object to delete. Omitted fields stay unchanged. Supports URL changes, linking, movement, resizing, labels, colors, fill styles, layer order, and viewport. Returns the updated project. A stale revision produces a conflict; re-read before retrying.')]
#[IsDestructive]
#[IsOpenWorld(false)]
class UpdateProject extends Tool
{
    public function handle(Request $request): Response|ResponseFactory
    {
        $identity = $request->validate(['project_id' => 'required|integer|min:1', 'revision' => 'required|integer|min:0']);
        $project = Project::find($identity['project_id']);
        if (! $project) {
            return Response::error('Project not found.');
        }
        $data = CanvasData::validate($project, $request->all());
        if ($data === []) {
            return Response::error('Supply at least one of name, screens, items, or viewport.');
        }
        if (! CanvasData::save($project, $data, $identity['revision'])) {
            return Response::error('Revision conflict: this canvas changed. Call get_project and reapply your intended changes to its latest state.');
        }

        return Response::structured(['project' => $project->fresh()->toArray()]);
    }

    /** @return array<string, Type> */
    public function schema(JsonSchema $schema): array
    {
        $geometry = [
            'id' => $schema->string()->description('Unique UUID; preserve existing IDs.')->required(),
            'x' => $schema->number()->min(-1000000)->max(1000000)->required(),
            'y' => $schema->number()->min(-1000000)->max(1000000)->required(),
            'zIndex' => $schema->integer()->min(0)->max(10000),
        ];

        return [
            'project_id' => $schema->integer()->min(1)->required(),
            'revision' => $schema->integer()->min(0)->description('Current revision returned by get_project.')->required(),
            'name' => $schema->string()->max(120),
            'screens' => $schema->array()->max(100)->description('Complete replacement list of screens.')->items($schema->object([
                ...$geometry,
                'title' => $schema->string()->max(120)->required(),
                'url' => $schema->string()->nullable()->description('HTTP(S) URL or null for a blank screen.')->required(),
                'width' => $schema->number()->min(320)->max(3840)->required(),
                'height' => $schema->number()->min(240)->max(2160)->required(),
                'linkGroup' => $schema->string()->nullable()->description('Shared UUID for URL-linked screens; null for independent.'),
            ])->withoutAdditionalProperties()),
            'items' => $schema->array()->max(200)->description('Complete replacement list of notes, images, text, and shapes.')->items($schema->object([
                ...$geometry,
                'zIndex' => $schema->integer()->min(0)->max(10000)->required(),
                'kind' => $schema->string()->enum(['note', 'image', 'text', 'square', 'rectangle', 'triangle', 'circle'])->required(),
                'width' => $schema->number()->min(40)->max(100000)->required(),
                'height' => $schema->number()->min(40)->max(100000)->required(),
                'content' => $schema->string()->nullable()->max(10000),
                'color' => $schema->string()->description('Six-digit hex color, e.g. #fef08a for yellow notes.')->required(),
                'filled' => $schema->boolean()->description('False for outline; true for solid or translucent.')->required(),
                'fillStyle' => $schema->string()->enum(['solid', 'translucent', 'outline']),
                'label' => $schema->string()->nullable()->max(120),
                'fontSize' => $schema->integer()->min(12)->max(120)->required(),
                'src' => $schema->string()->nullable()->description('For image items only: reuse an uploaded image path from this project.'),
            ])->withoutAdditionalProperties()),
            'viewport' => $schema->object([
                'x' => $schema->number()->min(-1000000)->max(1000000)->required(),
                'y' => $schema->number()->min(-1000000)->max(1000000)->required(),
                'zoom' => $schema->number()->min(0.1)->max(2)->required(),
            ])->withoutAdditionalProperties(),
        ];
    }
}
