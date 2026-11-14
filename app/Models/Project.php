<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Project extends Model
{
    protected $fillable = ['name', 'screens', 'items', 'viewport'];

    protected function casts(): array
    {
        return ['revision' => 'integer', 'screens' => 'array', 'items' => 'array', 'viewport' => 'array'];
    }
}
