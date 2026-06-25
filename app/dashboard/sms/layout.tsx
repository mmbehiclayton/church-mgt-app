import { ReactNode } from "react";
import SmsNav from "@/components/sms/SmsNav";

export default function SmsLayout({ children }: { children: ReactNode }) {
    return (
        <div className="space-y-6">
            <SmsNav />
            {children}
        </div>
    );
}
