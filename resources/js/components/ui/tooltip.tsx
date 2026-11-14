import * as React from 'react';
import { Tooltip as TooltipPrimitive } from 'radix-ui';
import { cn } from '@/lib/utils';

function TooltipProvider(props: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
    return <TooltipPrimitive.Provider delayDuration={350} {...props} />;
}

const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

function TooltipContent({ className, sideOffset = 6, children, ...props }: React.ComponentProps<typeof TooltipPrimitive.Content>) {
    return <TooltipPrimitive.Portal><TooltipPrimitive.Content data-slot="tooltip-content" sideOffset={sideOffset} className={cn('z-[100] rounded-md bg-foreground px-3 py-1.5 text-xs text-background shadow-md', className)} {...props}>{children}<TooltipPrimitive.Arrow className="fill-foreground" /></TooltipPrimitive.Content></TooltipPrimitive.Portal>;
}

function TooltipHint({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
    return <Tooltip><TooltipTrigger asChild><span className="inline-flex shrink-0 items-center">{children}</span></TooltipTrigger><TooltipContent side="bottom">{label}</TooltipContent></Tooltip>;
}

export { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent, TooltipHint };
