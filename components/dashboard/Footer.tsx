export default function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="border-t bg-white mt-auto">
            <div className="container mx-auto px-4 py-6">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-600">
                    <div className="flex flex-col md:flex-row items-center gap-2 text-center md:text-left">
                        <span className="font-semibold text-gray-900">Church Management System</span>
                        <span className="hidden md:inline">•</span>
                        <span>© {currentYear} All rights reserved</span>
                    </div>

                    <div className="flex items-center gap-6">
                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                            v0.1.0
                        </span>
                        <a
                            href="mailto:admin@church.com"
                            className="hover:text-gray-900 transition-colors"
                        >
                            Support
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
