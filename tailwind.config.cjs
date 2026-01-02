/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'bg-app': 'var(--bg-app)',
                'bg-sidebar': 'var(--bg-sidebar)',
                'bg-card': 'var(--bg-card)',
                'bg-card-hover': 'var(--bg-card-hover)',
                'bg-input': 'var(--bg-input)',
                'text-primary': 'var(--text-primary)',
                'text-secondary': 'var(--text-secondary)',
                'text-muted': 'var(--text-muted)',
                'accent-primary': 'var(--accent-primary)',
                'border-subtle': 'var(--border-subtle)',
                'danger': 'var(--danger)',
            }
        },
    },
    plugins: [],
}
