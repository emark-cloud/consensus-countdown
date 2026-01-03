import './globals.css';

export const metadata = {
  title: "Consensus Countdown",
  description: "A GenLayer mini-game powered by Optimistic Democracy",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-white text-gray-900 m-0">{children}</body>
    </html>
  );
}
