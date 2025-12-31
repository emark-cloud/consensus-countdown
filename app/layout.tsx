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
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
