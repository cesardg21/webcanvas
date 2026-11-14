<?php

namespace App\Http\Controllers;

use App\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ProjectImageController extends Controller
{
    public function store(Request $request, Project $project): JsonResponse
    {
        $request->validate(['image' => ['required', 'image', 'mimes:jpg,jpeg,png,gif,webp', 'max:10240', 'dimensions:max_width=10000,max_height=10000']]);
        $file = $request->file('image');
        [$width, $height] = getimagesize($file->getRealPath());
        $path = $file->store("projects/{$project->id}/images", 'local');
        abort_unless($path, 500, 'The image could not be stored.');

        return response()->json([
            'src' => route('projects.images.show', [$project, basename($path)], false),
            'width' => $width,
            'height' => $height,
        ], 201);
    }

    public function show(Project $project, string $filename): BinaryFileResponse
    {
        abort_unless(preg_match('/\A[a-zA-Z0-9]{40}\.(png|jpe?g|gif|webp)\z/', $filename), 404);
        $path = "projects/{$project->id}/images/{$filename}";
        abort_unless(Storage::disk('local')->exists($path), 404);

        return response()->file(Storage::disk('local')->path($path), ['X-Content-Type-Options' => 'nosniff']);
    }
}
