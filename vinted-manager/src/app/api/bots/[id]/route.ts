import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const data = await request.json()
    
    // Allow updating vintedEmail, vintedPhone, vintedPassword
    const updateData: any = {}
    if (data.vintedEmail !== undefined) updateData.vintedEmail = data.vintedEmail
    if (data.vintedPhone !== undefined) updateData.vintedPhone = data.vintedPhone
    if (data.vintedPassword !== undefined) updateData.vintedPassword = data.vintedPassword

    const updatedBot = await prisma.botAccount.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json({ success: true, data: updatedBot })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
