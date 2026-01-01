/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { LanguageSelector } from '../../components/LanguageSelector';
import { I18nProvider } from '../../i18n/useI18n';

// Mock Ionic components
vi.mock('@ionic/react', () => ({
    IonSelect: ({ children, value, onIonChange }: any) => (
        <select data-testid="ion-select" value={value} onChange={(e) => onIonChange({ detail: { value: e.target.value } })}>
            {children}
        </select>
    ),
    IonSelectOption: ({ value, children }: any) => (
        <option value={value}>{children}</option>
    ),
    IonItem: ({ children, lines, className }: any) => (
        <div data-testid="ion-item" data-lines={lines} className={className}>
            {children}
        </div>
    ),
    IonLabel: ({ children }: any) => <label>{children}</label>,
    IonIcon: ({ icon, slot, className }: any) => (
        <span data-testid="ion-icon" data-icon={icon} data-slot={slot} className={className}>icon</span>
    ),
}));

// Wrapper for I18nProvider
const wrapper = ({ children }: { children: React.ReactNode }) => (
    <I18nProvider>{children}</I18nProvider>
);

describe('LanguageSelector', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('select variant', () => {
        it('should render select variant by default', () => {
            render(<LanguageSelector />, { wrapper });

            expect(screen.getByTestId('ion-select')).toBeDefined();
        });

        it('should display available languages', () => {
            render(<LanguageSelector />, { wrapper });

            const options = screen.getAllByRole('option');
            expect(options.length).toBe(2);
            expect(options[0].textContent).toBe('English');
            expect(options[1].textContent).toBe('Română');
        });

        it('should show label by default', () => {
            render(<LanguageSelector />, { wrapper });

            expect(screen.getByText('Language')).toBeDefined();
        });

        it('should hide label when showLabel is false', () => {
            render(<LanguageSelector showLabel={false} />, { wrapper });

            expect(screen.queryByText('Language')).toBeNull();
        });

        it('should change language on select', () => {
            render(<LanguageSelector />, { wrapper });

            const select = screen.getByTestId('ion-select');
            fireEvent.change(select, { target: { value: 'ro' } });

            expect(localStorage.getItem('app_language')).toBe('ro');
        });
    });

    describe('compact variant', () => {
        it('should render compact variant when specified', () => {
            render(<LanguageSelector variant="compact" />, { wrapper });

            expect(screen.queryByTestId('ion-select')).toBeNull();
            expect(screen.getByText('EN')).toBeDefined();
            expect(screen.getByText('RO')).toBeDefined();
        });

        it('should have EN and RO buttons', () => {
            render(<LanguageSelector variant="compact" />, { wrapper });

            const buttons = screen.getAllByRole('button');
            expect(buttons.length).toBe(2);
        });

        it('should change language when clicking language button', () => {
            render(<LanguageSelector variant="compact" />, { wrapper });

            const roButton = screen.getByText('RO');
            fireEvent.click(roButton);

            expect(localStorage.getItem('app_language')).toBe('ro');
        });

        it('should highlight active language', () => {
            render(<LanguageSelector variant="compact" />, { wrapper });

            const enButton = screen.getByText('EN');
            expect(enButton.className).toContain('bg-cyber-emerald');
        });
    });

    describe('icon', () => {
        it('should display globe icon', () => {
            render(<LanguageSelector />, { wrapper });

            const icon = screen.getByTestId('ion-icon');
            expect(icon).toBeDefined();
        });
    });
});
