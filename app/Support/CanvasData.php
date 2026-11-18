<?php

namespace App\Support;

use App\Models\Project;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class CanvasData
{
    /** @return array<string, mixed> */
    public static function rules(Project $project): array
    {
        return [
            'display_settings' => 'sometimes|required|array:showDots,showLabels,showConnections',
            'display_settings.showDots' => 'required_with:display_settings|boolean',
            'display_settings.showLabels' => 'required_with:display_settings|boolean',
            'display_settings.showConnections' => 'required_with:display_settings|boolean',
            'name' => 'sometimes|required|string|max:120',
            'screens' => 'sometimes|present|array|max:100',
            'screens.*' => 'array:id,title,url,x,y,width,height,linkGroup,zIndex',
            'screens.*.zIndex' => 'sometimes|integer|between:0,10000',
            'screens.*.linkGroup' => 'sometimes|nullable|uuid',
            'screens.*.id' => 'required|uuid|distinct',
            'screens.*.title' => 'required|string|max:120',
            'screens.*.url' => ['nullable', 'url:http,https', 'max:4096'],
            'screens.*.x' => 'required|numeric|between:-1000000,1000000',
            'screens.*.y' => 'required|numeric|between:-1000000,1000000',
            'screens.*.width' => 'required|numeric|between:320,3840',
            'screens.*.height' => 'required|numeric|between:240,2160',
            'items' => 'sometimes|present|array|max:200',
            'items.*' => 'array:id,kind,x,y,width,height,zIndex,content,color,filled,fontSize,src,label,fillStyle',
            'items.*.id' => 'required|uuid|distinct',
            'items.*.kind' => 'required|in:note,text,image,square,rectangle,triangle,circle',
            'items.*.x' => 'required|numeric|between:-1000000,1000000',
            'items.*.y' => 'required|numeric|between:-1000000,1000000',
            'items.*.width' => 'required|numeric|between:40,100000',
            'items.*.height' => 'required|numeric|between:40,100000',
            'items.*.zIndex' => 'required|integer|between:0,10000',
            'items.*.content' => 'nullable|string|max:10000',
            'items.*.color' => ['required', 'regex:/^#[a-fA-F0-9]{6}$/'],
            'items.*.label' => 'sometimes|nullable|string|max:120',
            'items.*.fillStyle' => 'sometimes|required|in:solid,translucent,outline',
            'items.*.filled' => 'required|boolean',
            'items.*.fontSize' => 'required|integer|between:12,120',
            'items.*.src' => ['nullable', 'required_if:items.*.kind,image', 'string', 'regex:~^/projects/'.$project->id.'/images/[a-zA-Z0-9]{40}\.(png|jpe?g|gif|webp)$~'],
            'viewport' => 'sometimes|required|array:x,y,zoom',
            'viewport.x' => 'required_with:viewport|numeric|between:-1000000,1000000',
            'viewport.y' => 'required_with:viewport|numeric|between:-1000000,1000000',
            'viewport.zoom' => 'required_with:viewport|numeric|between:0.1,2',
        ];
    }

    /**
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    public static function validate(Project $project, array $input): array
    {
        $data = Validator::make($input, self::rules($project))->validate();
        $ids = array_column($data['screens'] ?? $project->screens, 'id');
        $ids = array_merge($ids, array_column($data['items'] ?? $project->items ?? [], 'id'));
        if (count($ids) !== count(array_unique($ids))) {
            throw ValidationException::withMessages(['items' => 'Every canvas object must have a unique ID.']);
        }

        return $data;
    }

    /** @param array<string, mixed> $data */
    public static function save(Project $project, array $data, int $expectedRevision): bool
    {
        $project->fill($data);
        $attributes = $project->getDirty();
        $attributes['revision'] = $expectedRevision + 1;
        $attributes['updated_at'] = now();

        return Project::whereKey($project->id)->where('revision', $expectedRevision)->update($attributes) === 1;
    }
}
