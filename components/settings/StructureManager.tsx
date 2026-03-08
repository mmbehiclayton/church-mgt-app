"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DepartmentsManager from "./DepartmentsManager";
import FellowshipsManager from "./FellowshipsManager";

interface Department {
    id: string;
    name: string;
    description: string | null;
    createdAt: Date;
    _count?: {
        members: number;
    };
}

interface Fellowship {
    id: string;
    name: string;
    leader: string | null;
    location: string | null;
    createdAt: Date;
    _count?: {
        members: number;
    };
}

interface StructureManagerProps {
    departments: Department[];
    fellowships: Fellowship[];
}

export default function StructureManager({ departments, fellowships }: StructureManagerProps) {
    return (
        <Tabs defaultValue="departments" className="w-full">
            <TabsList className="mb-4">
                <TabsTrigger value="departments">Departments</TabsTrigger>
                <TabsTrigger value="fellowships">Home Fellowships</TabsTrigger>
            </TabsList>
            <TabsContent value="departments">
                <DepartmentsManager initialDepartments={departments} />
            </TabsContent>
            <TabsContent value="fellowships">
                <FellowshipsManager initialFellowships={fellowships} />
            </TabsContent>
        </Tabs>
    );
}
