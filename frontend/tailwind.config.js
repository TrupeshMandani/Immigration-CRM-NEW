/** @type {import('tailwindcss').Config} */
export default {
	darkMode: ["class"],
	content: [
		"./index.html",
		"./src/**/*.{js,jsx,ts,tsx}"
	],
	theme: {
		extend: {
			colors: {
				primary: {
					900: "#0D1B2A",
					800: "#1B263B",
					600: "#415A77",
					400: "#778DA9",
					200: "#E0E1DD",
					DEFAULT: "#1B263B",
					foreground: "#E0E1DD"
				},
				secondary: {
					DEFAULT: "#415A77",
					foreground: "#E0E1DD"
				},
				background: "#ffffff",
				foreground: "#0D1B2A",
				surface: "#ffffff",
				muted: {
					DEFAULT: "#778DA9",
					foreground: "#0D1B2A"
				},
				accent: {
					DEFAULT: "#415A77",
					foreground: "#E0E1DD"
				},
				destructive: {
					DEFAULT: "#ef4444",
					foreground: "#E0E1DD"
				},
				border: "#778DA9",
				input: "#778DA9",
				ring: "#1B263B",
				card: {
					DEFAULT: "#ffffff",
					foreground: "#0D1B2A"
				},
				popover: {
					DEFAULT: "#ffffff",
					foreground: "#0D1B2A"
				}
			},

			fontFamily: {
				heading: ["var(--font-heading)"],
				body: ["var(--font-body)"],
				mono: ["var(--font-mono)"]
			},

			boxShadow: {
				soft: "var(--shadow-soft)",
				card: "var(--shadow-card)",
				focus: "var(--shadow-focus)"
			},

			borderRadius: {
				lg: "var(--radius)",
				md: "calc(var(--radius) - 2px)",
				sm: "calc(var(--radius) - 4px)"
			},

			// Add shimmer animation support
			keyframes: {
				shimmer: {
					"0%": { backgroundPosition: "200% 0" },
					"100%": { backgroundPosition: "-200% 0" }
				}
			},
			animation: {
				shimmer: "shimmer 2s linear infinite"
			}
		}
	},

	plugins: [
		require("tailwindcss-animate")
	]
};
