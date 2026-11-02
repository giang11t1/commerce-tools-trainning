
import { NextResponse } from "next/server";
import { getBusinessUnitAssociates } from "@/lib/associate-roles";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const result = await getBusinessUnitAssociates(id);

        return NextResponse.json(result);
    } catch (error) {
        console.error("Get Business Unit Associates failed:", error);

        return NextResponse.json(
            {
                message: "Failed to fetch Business Unit Associates",
                error:
                    error instanceof Error
                        ? error.message
                        : String(error),
            },
            { status: 500 }
        );
    }
}
