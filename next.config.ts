


// import type { NextConfig } from "next";

// const nextConfig: NextConfig = {
//   images: {
//     remotePatterns: [
//       {
//         protocol: "https",
//         hostname: "ik.imagekit.io", // ImageKit domain
//         port: "",
//         pathname: "/**", // allow all paths under this domain
//       },
//     ],
//   },
// };

// export default nextConfig;
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'replicate.delivery',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.replicate.delivery',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
