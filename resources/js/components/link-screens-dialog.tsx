import { linkTargets } from '@/lib/screens';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import type { Screen } from '@/types';
import { Link2, Unlink } from 'lucide-react';
import { useState } from 'react';

type Props = {
    screen: Screen | undefined;
    screens: Screen[];
    onClose: () => void;
    onLink: (sourceId: string, targetId: string) => void;
    onUnlink: (id: string) => void;
};
export function LinkScreensDialog({ screen, screens, onClose, onLink, onUnlink }: Props) {
    const [target, setTarget] = useState('');
    const linkedCount = screen?.linkGroup
        ? screens.filter((candidate) => candidate.linkGroup === screen.linkGroup).length
        : 0;
    return (
        <Dialog
            open={!!screen}
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Link screens</DialogTitle>
                    <DialogDescription>
                        Share a website address across screens. Each screen keeps its own size and
                        position. Links clicked inside a website stay independent.
                    </DialogDescription>
                </DialogHeader>
                {screen && (
                    <div className="dialog-form">
                        {linkedCount > 1 && (
                            <p className="link-note">
                                <Link2 size={15} /> This screen shares its address with{' '}
                                {linkedCount - 1} other {linkedCount === 2 ? 'screen' : 'screens'}.
                            </p>
                        )}
                        <label htmlFor="existing-link-target">Use the website from</label>
                        <select
                            id="existing-link-target"
                            className="canvas-select"
                            value={target}
                            onChange={(event) => setTarget(event.target.value)}
                        >
                            <option value="">Choose a screen…</option>
                            {linkTargets(screens, screen).map((screen) => (
                                <option key={screen.id} value={screen.id}>
                                    {screen.title} — {screen.width} × {screen.height}
                                </option>
                            ))}
                        </select>
                        <p className="small-note">
                            Linking replaces this screen’s address with the chosen screen’s address
                            and joins its group.
                        </p>
                        <div className="dialog-actions">
                            {screen.linkGroup && (
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        onUnlink(screen.id);
                                        onClose();
                                    }}
                                >
                                    <Unlink size={15} /> Unlink this screen
                                </Button>
                            )}
                            <Button
                                disabled={!target}
                                onClick={() => {
                                    onLink(screen.id, target);
                                    onClose();
                                }}
                            >
                                <Link2 size={15} /> Link screen
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
