<?php

use App\Http\Controllers\ProjectController;
use App\Http\Controllers\ProjectImageController;
use Illuminate\Support\Facades\Route;

Route::get('/', [ProjectController::class, 'index'])->name('projects.index');
Route::post('/projects', [ProjectController::class, 'store'])->name('projects.store');
Route::get('/projects/{project}', [ProjectController::class, 'show'])->name('projects.show');
Route::patch('/projects/{project}', [ProjectController::class, 'update'])->name('projects.update');
Route::delete('/projects/{project}', [ProjectController::class, 'destroy'])->name('projects.destroy');

Route::post('/projects/{project}/images', [ProjectImageController::class, 'store'])->name('projects.images.store');
Route::get('/projects/{project}/images/{filename}', [ProjectImageController::class, 'show'])->name('projects.images.show');

Route::get('/projects/{project}/state', [ProjectController::class, 'state'])->name('projects.state');
