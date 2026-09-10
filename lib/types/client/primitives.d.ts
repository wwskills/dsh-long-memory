/**
 * Reusable presentational primitives: Toast stack, Modal, ConfirmDialog,
 * PopoverMenu, SkeletonList, Switch, ConfidenceBar, EmptyState, ErrorState.
 *
 * ConfirmDialog replaces the old `window.confirm()` calls so every
 * confirmation is themed and consistent with the rest of the panel.
 *
 * @module @wwskills/dsh-long-memory/client/primitives
 */
import type { CSSProperties, ReactNode } from 'react';
import type { Translate } from './locales.js';
export type ToastType = 'success' | 'error' | 'warning';
export interface ToastItem {
    id: number;
    message: string;
    type: ToastType;
}
export declare function Toast(props: {
    toasts: ToastItem[];
    onDismiss: (id: number) => void;
}): JSX.Element | null;
/** Toast queue hook: returns the list, a `show(message, type)` and dismiss. */
export declare function useToasts(): {
    toasts: ToastItem[];
    showToast: (message: string, type?: ToastType) => void;
    dismissToast: (id: number) => void;
};
export declare function Modal(props: {
    title: ReactNode;
    onClose: () => void;
    children: ReactNode;
    footer?: ReactNode;
    width?: number;
}): JSX.Element;
export declare function ConfirmDialog(props: {
    t: Translate;
    title: string;
    message: ReactNode;
    confirmLabel?: string;
    danger?: boolean;
    busy?: boolean;
    onConfirm: () => void;
    onClose: () => void;
}): JSX.Element;
export interface MenuItem {
    icon?: ReactNode;
    label: string;
    danger?: boolean;
    onClick: () => void;
}
export declare function PopoverMenu(props: {
    items: MenuItem[];
    visible: boolean;
}): JSX.Element;
export declare function SkeletonList(props: {
    count?: number;
}): JSX.Element;
export declare function EmptyState(props: {
    children: ReactNode;
}): JSX.Element;
export declare function ErrorState(props: {
    t: Translate;
    message?: string;
    onRetry?: () => void;
}): JSX.Element;
export declare function Switch(props: {
    checked: boolean;
    onChange: () => void;
    ariaLabel?: string;
}): JSX.Element;
export declare function ConfidenceBar(props: {
    value: number;
    color: string;
    label?: string;
}): JSX.Element;
/** Small labelled chip used for category / type / scope tags. */
export declare function Chip(props: {
    icon?: ReactNode;
    label: ReactNode;
    fg?: string;
    bg?: string;
    border?: string;
    style?: CSSProperties;
}): JSX.Element;
//# sourceMappingURL=primitives.d.ts.map