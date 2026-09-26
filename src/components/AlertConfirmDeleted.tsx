import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from './ui/dialog';
import { Button } from './ui/button';
import { Spinner } from './ui/SpinnerVariants';
import { AlertTriangle, X } from 'lucide-react';

interface Props {
    children: React.ReactNode;
    title: string;
    description: string;
    cancel: string;
    confirm: string;
    confirmAction: () => void;
    loading?: boolean;
    style?: string;
}

const AlertConfirmDeleted = ({ children, title, description, cancel, confirm, confirmAction, loading, style }: Props) => {
    const [isOpen, setIsOpen] = useState(false);

    // Closes the dialog automatically when loading ends (adjusted during render
    // rather than in an effect).
    const [prevLoading, setPrevLoading] = useState(loading);
    if (prevLoading !== loading) {
        setPrevLoading(loading);
        if (loading === false) setIsOpen(false);
    }

    const handleConfirm = (e: React.MouseEvent) => {
        e.preventDefault();
        confirmAction();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            // Prevent closing while loading
            if (loading) return;
            setIsOpen(open);
        }}>
            <DialogTrigger asChild className={style}>
                {children}
            </DialogTrigger>

            <DialogContent
                className="max-w-[450px] gap-0 p-0 overflow-hidden bg-white rounded-2xl shadow-xl border-none"
                // Prevent closing on outside click WHILE loading
                onInteractOutside={(e: Event) => {
                    if (loading) {
                        e.preventDefault();
                    }
                }}
            >

                <button
                    onClick={() => !loading && setIsOpen(false)}
                    disabled={loading}
                    className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-slate-100 data-[state=open]:text-slate-500"
                >
                    <X className="h-4 w-4 text-slate-500" />
                    <span className="sr-only">Fermer</span>
                </button>

                <div className="p-6 flex flex-col sm:flex-row sm:items-start gap-4">
                    <div className="mx-auto sm:mx-0 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:h-10 sm:w-10">
                        <AlertTriangle className="h-6 w-6 text-red-600" aria-hidden="true" />
                    </div>

                    <div className="text-center sm:text-left space-y-2 pr-4">
                        <DialogHeader className="p-0 space-y-2 text-left">
                            <DialogTitle className="text-lg font-bold text-slate-900">
                                {title}
                            </DialogTitle>
                            <DialogDescription className="text-slate-500 text-sm leading-relaxed">
                                {description}
                            </DialogDescription>
                        </DialogHeader>
                    </div>
                </div>

                <DialogFooter className="bg-slate-50 p-4 sm:px-6 sm:flex-row-reverse gap-3">
                    <Button
                        variant="destructive"
                        onClick={handleConfirm}
                        disabled={loading}
                        className="bg-red-600 hover:bg-red-700 text-white shadow-sm w-full sm:w-auto min-w-[100px]"
                    >
                        {loading ? (
                            <div className="flex items-center gap-2">
                                <Spinner className="text-white w-4 h-4 border-2" />
                                <span>Suppression...</span>
                            </div>
                        ) : (
                            confirm
                        )}
                    </Button>

                    <Button
                        variant="outline"
                        onClick={() => setIsOpen(false)}
                        disabled={loading}
                        className="mt-2 sm:mt-0 border-slate-200 text-slate-700 hover:bg-white hover:text-slate-900 bg-white w-full sm:w-auto"
                    >
                        {cancel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default AlertConfirmDeleted;