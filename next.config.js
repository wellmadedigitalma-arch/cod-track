/** @type {import('next').NextConfig} */
const nextConfig = {
    env: {
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        YOUCAN_CLIENT_ID: process.env.YOUCAN_CLIENT_ID,
        YOUCAN_CLIENT_SECRET: process.env.YOUCAN_CLIENT_SECRET,
        YOUCAN_REDIRECT_URI: process.env.YOUCAN_REDIRECT_URI,
    },
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "**",
            },
        ],
    },
    typescript: {
        ignoreBuildErrors: true,
    },
    reactStrictMode: true,
};

module.exports = nextConfig;