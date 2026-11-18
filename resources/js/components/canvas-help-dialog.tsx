import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

export function CanvasHelpDialog({
    open,
    onOpenChange,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>A little canvas know-how</DialogTitle>
                    <DialogDescription>Your shortcuts to the bigger picture.</DialogDescription>
                </DialogHeader>
                <div className="help-list">
                    <p>
                        <span>Undo / redo</span>
                        <kbd>⌘/Ctrl + Z / Shift + Z</kbd>
                    </p>
                    <p>
                        <span>Delete selected items</span>
                        <kbd>Backspace / Delete</kbd>
                    </p>
                    <p>
                        <span>Select / hand tool</span>
                        <kbd>V / H</kbd>
                    </p>
                    <p>
                        <span>Pan canvas</span>
                        <kbd>Space + drag</kbd>
                    </p>
                    <p>
                        <span>Zoom in / out</span>
                        <kbd>+ / −</kbd>
                    </p>
                    <p>
                        <span>Fit all / actual size</span>
                        <kbd>0 / 1</kbd>
                    </p>
                    <p>
                        <span>Use a live website</span>
                        <kbd>Double-click screen</kbd>
                    </p>
                    <p>
                        Drag the corner of a screen to resize it. Changes save automatically to your
                        local database.
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}
