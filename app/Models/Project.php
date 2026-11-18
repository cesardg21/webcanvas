<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Project extends Model
{
    protected $fillable = ['name', 'screens', 'items', 'viewport', 'display_settings'];

    protected function casts(): array
    {
        return ['revision' => 'integer', 'screens' => 'array', 'items' => 'array', 'viewport' => 'array', 'display_settings' => 'array'];
    }
}
