// app/layout.jsx
import { PermissionsProvider } from '@/lib/providers/PermissionsProvider'; // Check this path

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <PermissionsProvider>
          {children}
        </PermissionsProvider>
      </body>
    </html>
  );
}