<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Support\CanvasData;
use Illuminate\Http\JsonResponse;
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
        $request->validate(['revision' => 'sometimes|required|integer|min:0']);
        $data = CanvasData::validate($project, $request->all());
        $revision = (int) $request->input('revision', $project->revision);
        if (! CanvasData::save($project, $data, $revision)) {
            return response()->json(['message' => 'This canvas changed elsewhere. Load the latest version before saving.'], 409);
        }

        return response()->json(['saved' => true, 'revision' => $revision + 1]);
    }

    public function state(Project $project): JsonResponse
    {
        return response()->json(['project' => $project])->header('Cache-Control', 'no-store');
    }

    public function destroy(Project $project)
    {
        $project->delete();

        return to_route('projects.index');
    }
}
