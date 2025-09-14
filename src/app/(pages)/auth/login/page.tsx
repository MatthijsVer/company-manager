import { LoginForm } from "@/components/login-form";
import { ArcTimeline } from "@/components/magicui/arc-timeline";

export default function LoginPage() {
  const data = [
    {
      time: "Foundation",
      steps: [
        { icon: <span>🚀</span>, content: "Platform launch" },
        { icon: <span>👥</span>, content: "User & role management" },
      ],
    },
    {
      time: "Finance",
      steps: [
        { icon: <span>💳</span>, content: "Invoicing & payments" },
        { icon: <span>🗂️</span>, content: "Client profiles" },
      ],
    },
    {
      time: "Organization",
      steps: [
        { icon: <span>📅</span>, content: "Calendar & planning" },
        { icon: <span>📝</span>, content: "Project tasks & Kanban" },
      ],
    },
    {
      time: "Collaboration",
      steps: [
        { icon: <span>📄</span>, content: "Documents & contracts" },
        { icon: <span>🔔</span>, content: "Reminders & notifications" },
      ],
    },
    {
      time: "Productivity",
      steps: [
        { icon: <span>⏱️</span>, content: "Time tracking & clocking" },
        { icon: <span>📊</span>, content: "Analytics & reports" },
      ],
    },
    {
      time: "Customization",
      steps: [
        { icon: <span>🔗</span>, content: "Integrations (email, API)" },
        { icon: <span>⚙️</span>, content: "Custom workflows" },
      ],
    },
    {
      time: "Expansion",
      steps: [
        { icon: <span>🌍</span>, content: "Multi-language support" },
        { icon: <span>🏢</span>, content: "Multi-tenant for agencies" },
      ],
    },
    {
      time: "Future",
      steps: [
        { icon: <span>🤖</span>, content: "AI automation & insights" },
        { icon: <span>🚀</span>, content: "Scaling & growth" },
      ],
    },
  ];

  return (
    <div className="bg-sidebar relative flex min-h-svh flex-col items-center justify-center">
      <ArcTimeline data={data} className="bottom-80" />;
      <div className="w-full max-w-sm md:max-w-4xl p-6 md:p-20 absolute bottom-12 left-1/2 -translate-x-1/2">
        <LoginForm />
      </div>
    </div>
  );
}
