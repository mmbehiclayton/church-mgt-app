import { getCategories } from "@/app/actions";
import CategoriesManager from "@/components/CategoriesManager";

export const dynamic = 'force-dynamic';

export default async function FinanceSettingsPage() {
    const categories = await getCategories();

    return (
        <div className="space-y-6 px-4 md:px-0 mt-6 md:mt-0">
            <div>
                <h2 className="text-xl font-semibold tracking-tight text-slate-900">Finance Categories</h2>
                <p className="text-sm text-muted-foreground mt-1 mb-4">Manage transaction categories for financial records.</p>
            </div>
            <CategoriesManager initialCategories={categories} />
        </div>
    );
}
