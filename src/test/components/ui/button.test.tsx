/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { Button, buttonVariants } from '../../../components/ui/button';

describe('Button', () => {
    describe('rendering', () => {
        it('should render a button element', () => {
            render(<Button>Click me</Button>);

            const button = screen.getByRole('button', { name: /click me/i });
            expect(button).toBeDefined();
        });

        it('should render children', () => {
            render(<Button>Test Button</Button>);

            expect(screen.getByText('Test Button')).toBeDefined();
        });

        it('should forward ref to button element', () => {
            const ref = React.createRef<HTMLButtonElement>();
            render(<Button ref={ref}>Button</Button>);

            expect(ref.current).toBeDefined();
            expect(ref.current?.tagName).toBe('BUTTON');
        });

        it('should apply custom className', () => {
            render(<Button className="custom-class">Button</Button>);

            const button = screen.getByRole('button');
            expect(button.className).toContain('custom-class');
        });
    });

    describe('variants', () => {
        it('should apply default variant styles', () => {
            render(<Button variant="default">Default</Button>);

            const button = screen.getByRole('button');
            expect(button.className).toContain('bg-mobile-primary');
        });

        it('should apply outline variant styles', () => {
            render(<Button variant="outline">Outline</Button>);

            const button = screen.getByRole('button');
            expect(button.className).toContain('border');
        });

        it('should apply ghost variant styles', () => {
            render(<Button variant="ghost">Ghost</Button>);

            const button = screen.getByRole('button');
            expect(button.className).toContain('bg-transparent');
        });
    });

    describe('sizes', () => {
        it('should apply default size', () => {
            render(<Button size="default">Default</Button>);

            const button = screen.getByRole('button');
            expect(button.className).toContain('h-11');
        });

        it('should apply sm size', () => {
            render(<Button size="sm">Small</Button>);

            const button = screen.getByRole('button');
            expect(button.className).toContain('h-9');
        });

        it('should apply icon size', () => {
            render(<Button size="icon">Icon</Button>);

            const button = screen.getByRole('button');
            expect(button.className).toContain('w-11');
        });
    });

    describe('props', () => {
        it('should handle onClick', async () => {
            const user = userEvent.setup();
            let clicked = false;

            render(<Button onClick={() => { clicked = true; }}>Click</Button>);

            await user.click(screen.getByRole('button'));
            expect(clicked).toBe(true);
        });

        it('should handle disabled state', () => {
            render(<Button disabled>Disabled</Button>);

            const button = screen.getByRole('button');
            expect(button.hasAttribute('disabled')).toBe(true);
        });

        it('should pass through button attributes', () => {
            render(<Button type="submit" id="submit-btn">Submit</Button>);

            const button = screen.getByRole('button');
            expect(button.getAttribute('type')).toBe('submit');
            expect(button.getAttribute('id')).toBe('submit-btn');
        });
    });

    describe('asChild', () => {
        it('should render as child element when asChild is true', () => {
            render(
                <Button asChild>
                    <a href="/test">Link Button</a>
                </Button>
            );

            const link = screen.getByRole('link', { name: /link button/i });
            expect(link).toBeDefined();
            expect(link.getAttribute('href')).toBe('/test');
        });
    });

    describe('buttonVariants', () => {
        it('should export buttonVariants function', () => {
            expect(typeof buttonVariants).toBe('function');
        });

        it('should generate class names', () => {
            const classes = buttonVariants({ variant: 'default', size: 'default' });
            expect(typeof classes).toBe('string');
            expect(classes.length).toBeGreaterThan(0);
        });

        it('should handle different variant combinations', () => {
            const defaultClasses = buttonVariants({ variant: 'default' });
            const outlineClasses = buttonVariants({ variant: 'outline' });

            expect(defaultClasses).not.toBe(outlineClasses);
        });
    });
});
