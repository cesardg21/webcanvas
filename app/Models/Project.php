<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Project extends Model
{
    protected $fillable = ['name', 'screens', 'viewport'];

    protected function casts(): array
    {
        return ['screens' => 'array', 'viewport' => 'array'];
    }
}
