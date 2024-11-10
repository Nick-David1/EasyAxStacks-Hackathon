"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  principalCV,
  uintCV,
  boolCV,
  PostConditionMode,
} from "@stacks/transactions";
import { openContractCall } from "@stacks/connect";
import { userSession } from "@/lib/userSession";

interface Event {
  id: number;
  organizer: string;
  name: string;
  date: number;
  location: string;
  maxCapacity: number;
  stakeAmount: number;
  participants: string[];
  status: string;
}

interface EventDetailsProps {
  event: Event;
}

const EventDetails: React.FC<EventDetailsProps> = ({ event }) => {
  const [participants, setParticipants] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState<boolean>(false);

  useEffect(() => {
    fetchParticipants();
  }, [event, refresh]);

  const fetchParticipants = async () => {
    setLoading(true);
    try {
      // Assuming there's a read-only function to get participants
      const response = await fetch(`/api/get-event/${event.id}`); // You'll need to implement this API
      const data = await response.json();
      setParticipants(data.participants);
      setError(null);
    } catch (err) {
      console.error("Error fetching participants:", err);
      setError("Failed to fetch participants.");
    } finally {
      setLoading(false);
    }
  };

  const markAttendance = async (participant: string, attended: boolean) => {
    try {
      await openContractCall({
        network: "devnet",
        contractAddress: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
        contractName: "payment-stream",
        functionName: "mark-attendance",
        functionArgs: [
          uintCV(event.id),
          principalCV(participant),
          boolCV(attended),
        ],
        postConditionMode: PostConditionMode.Allow,
        onFinish: (result) => {
          console.log("Mark Attendance Transaction ID:", result);
          setRefresh(!refresh); // Refresh participant list
        },
        onCancel: () => {
          console.log("Mark Attendance Transaction cancelled");
        },
      });
    } catch (error) {
      console.error("Error marking attendance:", error);
      alert("Failed to mark attendance. Please try again.");
    }
  };

  const refundStake = async () => {
    try {
      await openContractCall({
        network: "devnet",
        contractAddress: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
        contractName: "payment-stream",
        functionName: "refund",
        functionArgs: [uintCV(event.id)],
        postConditionMode: PostConditionMode.Allow,
        onFinish: (result) => {
          console.log("Refund Transaction ID:", result);
          alert("Refund successful!");
          setRefresh(!refresh); // Refresh participant list
        },
        onCancel: () => {
          console.log("Refund Transaction cancelled");
        },
      });
    } catch (error) {
      console.error("Error processing refund:", error);
      alert("Failed to process refund. Please try again.");
    }
  };

  // Helper to determine if the user is the organizer
  const isOrganizer = () => {
    const userData = userSession.loadUserData();
    const userAddress = userData.profile.stxAddress.mainnet || userData.profile.stxAddress.devnet;
    return userAddress === event.organizer;
  };

  return (
    <div className="mt-4">
      <Card>
        <CardHeader>
          <CardTitle>Participants</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div>Loading participants...</div>
          ) : error ? (
            <Alert>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : participants.length === 0 ? (
            <div>No participants yet.</div>
          ) : (
            <div className="space-y-2">
              {participants.map((participant, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center p-2 border rounded"
                >
                  <span className="truncate">{participant}</span>
                  {isOrganizer() && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => markAttendance(participant, true)}
                      className="mr-2"
                    >
                      Attended
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Refund Section for Participants */}
      {!isOrganizer() && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Refund</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              onClick={refundStake}
              className="w-full"
            >
              Refund Stake
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EventDetails;
