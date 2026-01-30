import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Create a Google Calendar event
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('googleAccessToken')?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Not connected to Google Calendar' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { title, description, startTime, endTime, location } = body;

    // Create event in Google Calendar
    const event = {
      summary: title,
      description: description || '',
      location: location || '',
      start: {
        dateTime: startTime,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: endTime,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      reminders: {
        useDefault: true,
      },
    };

    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('Google Calendar API error:', error);
      
      // If token expired, indicate need to reconnect
      if (response.status === 401) {
        return NextResponse.json(
          { error: 'Token expired, please reconnect Google Calendar' },
          { status: 401 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to create calendar event' },
        { status: response.status }
      );
    }

    const createdEvent = await response.json();
    return NextResponse.json({ 
      success: true, 
      eventId: createdEvent.id,
      htmlLink: createdEvent.htmlLink 
    });
  } catch (error) {
    console.error('Calendar sync error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Get events from Google Calendar
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('googleAccessToken')?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Not connected to Google Calendar' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const timeMin = searchParams.get('timeMin') || new Date().toISOString();
    const timeMax = searchParams.get('timeMax') || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        return NextResponse.json(
          { error: 'Token expired, please reconnect Google Calendar' },
          { status: 401 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to fetch calendar events' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({ events: data.items || [] });
  } catch (error) {
    console.error('Calendar fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Update a Google Calendar event
export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('googleAccessToken')?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Not connected to Google Calendar' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { eventId, title, description, startTime, endTime, location } = body;

    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      );
    }

    const event = {
      summary: title,
      description: description || '',
      location: location || '',
      start: {
        dateTime: startTime,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: endTime,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    };

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to update calendar event' },
        { status: response.status }
      );
    }

    const updatedEvent = await response.json();
    return NextResponse.json({ success: true, event: updatedEvent });
  } catch (error) {
    console.error('Calendar update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Delete a Google Calendar event
export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('googleAccessToken')?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Not connected to Google Calendar' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const eventId = searchParams.get('eventId');

    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      );
    }

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok && response.status !== 204) {
      return NextResponse.json(
        { error: 'Failed to delete calendar event' },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Calendar delete error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
