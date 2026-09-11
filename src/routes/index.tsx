import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  ssr: false,
  component: Home,
});

function Home() {
  return (
    <div style={{ minHeight: "100dvh", background: "#FFFBF5" }} aria-label="Opening the QR" />
  );
}
