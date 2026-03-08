import { ReactNode } from "react";
import SettingsNav from "@/components/settings/SettingsNav";

export default function SettingsLayout({ children }: { children: ReactNode }) {
    return (
        <div className="space-y-6 flex flex-col md:flex-row md:space-x-12 md:space-y-0 pb-16">
            <aside className="-mx-4 md:mx-0 md:w-1/5 shrink-0">
                <SettingsNav />
            </aside>
            <div className="flex-1 lg:max-w-4xl">{children}</div>
        </div>
    );
}
