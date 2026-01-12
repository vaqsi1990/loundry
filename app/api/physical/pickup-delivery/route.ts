import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import nodemailer from "nodemailer";

// Get pickup/delivery requests for physical person hotel
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "არ არის ავტორიზებული" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        hotels: {
          where: { type: "PHYSICAL" },
        },
      },
    });

    if (!user || !user.hotels || user.hotels.length === 0) {
      return NextResponse.json(
        { error: "ფიზიკური პირის სასტუმრო არ მოიძებნა" },
        { status: 404 }
      );
    }

    const hotel = user.hotels[0];

    const requests = await prisma.physicalPickupDeliveryRequest.findMany({
      where: {
        hotelId: hotel.id,
        userId: session.user.id,
      },
      orderBy: {
        requestedAt: "desc",
      },
    });

    return NextResponse.json(requests);
  } catch (error) {
    console.error("Pickup/delivery requests fetch error:", error);
    return NextResponse.json(
      { error: "მოთხოვნების ჩატვირთვისას მოხდა შეცდომა" },
      { status: 500 }
    );
  }
}

// Create pickup/delivery request
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "არ არის ავტორიზებული" },
        { status: 401 }
      );
    }

    const body: any = await request.json();
    const { requestType, notes } = body;

    if (!requestType || !["PICKUP", "DELIVERY", "BOTH"].includes(requestType)) {
      return NextResponse.json(
        { error: "მოთხოვნის ტიპი აუცილებელია (PICKUP, DELIVERY, ან BOTH)" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        hotels: {
          where: { type: "PHYSICAL" },
        },
      },
    });

    if (!user || !user.hotels || user.hotels.length === 0) {
      return NextResponse.json(
        { error: "ფიზიკური პირის სასტუმრო არ მოიძებნა" },
        { status: 404 }
      );
    }

    const hotel = user.hotels[0];

    const pickupRequest = await prisma.physicalPickupDeliveryRequest.create({
      data: {
        hotelId: hotel.id,
        userId: session.user.id,
        requestType,
        notes: notes || null,
        status: "PENDING",
      },
    });

    // Send email notification to kl.kinglaundry@gmail.com
    try {
      if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
        // Create email transporter
        const getTransporter = () => {
          if (process.env.SMTP_HOST && process.env.SMTP_PORT) {
            return nodemailer.createTransport({
              host: process.env.SMTP_HOST,
              port: parseInt(process.env.SMTP_PORT),
              secure: process.env.SMTP_PORT === "465",
              auth: {
                user: process.env.SMTP_USER || process.env.EMAIL_USER,
                pass: process.env.SMTP_PASSWORD || process.env.EMAIL_PASSWORD,
              },
              tls: {
                rejectUnauthorized: false,
              },
            });
          }
          return nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 587,
            secure: false,
            auth: {
              user: process.env.EMAIL_USER,
              pass: process.env.EMAIL_PASSWORD,
            },
            tls: {
              rejectUnauthorized: false,
              ciphers: "SSLv3",
            },
          });
        };

        const transporter = getTransporter();
        const fromEmail = process.env.EMAIL_USER;
        const fromName = process.env.EMAIL_FROM_NAME || "ქინგ ლონდრი";
        const adminEmail = "kl.kinglaundry@gmail.com";
        
        // Get request type in Georgian
        const requestTypeText = 
          requestType === "PICKUP" ? "წასაღები" :
          requestType === "DELIVERY" ? "მოსატანი" :
          "წასაღები და მოსატანი";

        // Prepare email content
        const subject = `ახალი მოთხოვნა: ${requestTypeText} - ${hotel.hotelName}`;
        
        await transporter.sendMail({
          from: `${fromName} <${fromEmail}>`,
          to: adminEmail,
          subject: subject,
          text: `ახალი ${requestTypeText} მოთხოვნა შექმნილია:
            
სასტუმრო: ${hotel.hotelName}
მომხმარებელი: ${user.name || user.email || "უცნობი"}
მოთხოვნის ტიპი: ${requestTypeText}
თარიღი: ${new Date().toLocaleString("ka-GE")}
${notes ? `შენიშვნა: ${notes}` : ""}

გთხოვთ შეამოწმოთ მოთხოვნა ადმინისტრაციის პანელში.`,
          html: `<div style="font-family: Arial, sans-serif; padding: 20px;">
              <h2 style="color: #333;">ახალი ${requestTypeText} მოთხოვნა</h2>
              <p><strong>სასტუმრო:</strong> ${hotel.hotelName}</p>
              <p><strong>მომხმარებელი:</strong> ${user.name || user.email || "უცნობი"}</p>
              <p><strong>მოთხოვნის ტიპი:</strong> ${requestTypeText}</p>
              <p><strong>თარიღი:</strong> ${new Date().toLocaleString("ka-GE")}</p>
              ${notes ? `<p><strong>შენიშვნა:</strong> ${notes}</p>` : ""}
              <p style="margin-top: 20px;">
                <a href="${process.env.NEXTAUTH_URL || "http://localhost:3000"}/admin/pickup-delivery" 
                   style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                  ნახეთ მოთხოვნა
                </a>
              </p>
            </div>`,
        });
        console.log(`Pickup/delivery notification sent to: ${adminEmail}`);
      }
    } catch (emailError) {
      // Don't fail the request if email fails, just log it
      console.error("Failed to send pickup/delivery notification email:", emailError);
    }

    return NextResponse.json(
      { message: "მოთხოვნა წარმატებით შეიქმნა", request: pickupRequest },
      { status: 201 }
    );
  } catch (error) {
    console.error("Pickup/delivery request creation error:", error);
    return NextResponse.json(
      { error: "მოთხოვნის შექმნისას მოხდა შეცდომა" },
      { status: 500 }
    );
  }
}

