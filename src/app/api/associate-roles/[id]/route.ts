
import { NextResponse } from "next/server";
import { getAssociateRoleById } from "@/lib/associate-roles";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const role = await getAssociateRoleById(id);

        return NextResponse.json(role);
    } catch (error) {
        console.error("Get Associate Role by ID failed:", error);

        return NextResponse.json(
            { message: "Failed to fetch Associate Role" },
            { status: 500 }
        );
    }
}
