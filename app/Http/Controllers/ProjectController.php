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
        $project = Project::create($data + ['screens' => [], 'viewport' => ['x' => 100, 'y' => 140, 'zoom' => 0.6]]);

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
            'screens.*' => 'array:id,title,url,x,y,width,height,linkGroup',
            'screens.*.linkGroup' => 'sometimes|nullable|uuid',
            'screens.*.id' => 'required|uuid|distinct',
            'screens.*.title' => 'required|string|max:120',
            'screens.*.url' => ['nullable', 'url:http,https', 'max:4096'],
            'screens.*.x' => 'required|numeric|between:-1000000,1000000',
            'screens.*.y' => 'required|numeric|between:-1000000,1000000',
            'screens.*.width' => 'required|numeric|between:320,3840',
            'screens.*.height' => 'required|numeric|between:240,2160',
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
