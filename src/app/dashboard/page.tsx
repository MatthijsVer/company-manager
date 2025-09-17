import ActivityBillability from "@/components/analytics/ActivityBillability";
import DailyTasks from "@/components/analytics/DailyTasks";
import NextHoliday from "@/components/analytics/NextHoliday";
import RecordWidget from "@/components/analytics/RecordWidget";
import TaskProgress from "@/components/analytics/TaskProgress";
import TimeTrackerWidget from "@/components/analytics/TimeTrackerWidget";
import UserOverview from "@/components/analytics/UserOverview";

export default function StatsPage() {
  return (
    <div className="min-h-screen">
      {/* Main Content */}
      <div className="container mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
          {/* Activity & Billability Card */}
          <div className="col-span-2 flex gap-y-4 flex-col">
            <UserOverview />
            <ActivityBillability userId="me" />
          </div>

          <div className="col-span-2 flex gap-y-4 flex-col">
            <TaskProgress userId="me" />
            <RecordWidget />
            <NextHoliday />
          </div>

          <div className="col-span-3 flex gap-y-4 flex-col">
            <TimeTrackerWidget />
            <DailyTasks />
          </div>
        </div>

        {/* You can add the Schedule section below */}
        <div className="mt-8">{/* Schedule component would go here */}</div>
      </div>
    </div>
  );
}
