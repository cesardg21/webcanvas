<?php

namespace App\Http\Controllers;

use App\Models\Project;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ProjectController extends Controller
{
    public function index()
    {
        return Inertia::render('Projects', [
            'projects' => Project::latest('updated_at')->get(),
            'release' => [
                'version' => (string) config('app.version'),
                'build' => (string) config('app.build'),
                'isLocal' => config('app.env') === 'local',
            ],
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate(['name' => 'required|string|max:120']);
        $project = Project::create($data + ['screens' => [], 'items' => [], 'viewport' => ['x' => 100, 'y' => 140, 'zoom' => 0.6]]);

        return to_route('projects.show', $project);
    }

    public function show(Project $project)
    {
        return Inertia::render('Canvas', ['project' => $project]);
    }

    public function update(Request $request, Project $project)
    {
        $data = $request->validate([
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
        ]);
        $project->update($data);

        return response()->json(['saved' => true]);
    }

    public function destroy(Project $project)
    {
        $project->delete();

        return to_route('projects.index');
    }
}
