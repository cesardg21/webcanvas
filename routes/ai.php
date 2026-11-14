<?php

use App\Mcp\Servers\WebcanvasServer;
use Laravel\Mcp\Facades\Mcp;

Mcp::local('webcanvas', WebcanvasServer::class);
