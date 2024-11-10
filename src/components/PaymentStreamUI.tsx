"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Wallet, Calendar, Users, RefreshCw, Bitcoin } from "lucide-react";
import { showConnect, openContractCall } from "@stacks/connect";
import { userSession } from "@/lib/userSession";
import {
  uintCV,
  tupleCV,
  principalCV,
  stringAsciiCV,
  boolCV,
  PostConditionMode,
} from "@stacks/transactions";
import EventDetails from "@/components/EventDetails"
import { fetchReadOnlyFunction } from "@stacks/transactions";

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

const PaymentStreamUI = () => {
  const [walletConnected, setWalletConnected] = useState(false);
  const [btcAmount, setBtcAmount] = useState("");
  const [activeStep, setActiveStep] = useState(0);
  const [events, setEvents] = useState<Event[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userSession.isUserSignedIn()) {
      setWalletConnected(true);
      setActiveStep(1);
      fetchEvents();
    }
  }, []);

  const disconnectWallet = () => {
    userSession.signUserOut();
    setWalletConnected(false);
    setActiveStep(0);
  };

  const connectWallet = async () => {
    try {
      showConnect({
        userSession,
        appDetails: {
          name: "Kickback on Stacks",
          icon: window.location.origin + "/favicon.ico",
        },
        onFinish: () => {
          setWalletConnected(true);
          setActiveStep(1);
          fetchEvents();
        },
        onCancel: () => {
          console.log("Wallet connection cancelled");
        },
      });
    } catch (error) {
      console.error("Wallet connection error:", error);
    }
  };

  // Fetch all events from the smart contract
  const fetchEvents = async () => {
    try {
      // Assuming there's a read-only function in the contract to get all events
      const response = await fetch("/api/get-events"); // You'll need to implement this API
      const data = await response.json();
      setEvents(data.events);
    } catch (err) {
      console.error("Error fetching events:", err);
      setError("Failed to fetch events.");
    }
  };

  const handleBTCDeposit = async () => {
    if (!btcAmount || parseFloat(btcAmount) <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    setIsProcessing(true);
    try {
      // Step 1: Mock BTC deposit
      console.log("Mocking BTC deposit of", btcAmount, "BTC");
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const mockBtcTxId = Math.random().toString(16).slice(2);
      console.log("Mock BTC Transaction:", mockBtcTxId);

      // Step 2: Call sBTC mint function
      await openContractCall({
        network: "devnet",
        contractAddress: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
        contractName: "sbtc-token",
        functionName: "mint",
        functionArgs: [
          uintCV(Math.floor(parseFloat(btcAmount) * 100000000)), // amount in sats
          principalCV(userSession.loadUserData().profile.stxAddress.mainnet || "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"), // recipient (user's address)
        ],
        postConditionMode: PostConditionMode.Allow,
        onFinish: (result) => {
          console.log("sBTC mint transaction:", result);
          setIsProcessing(false);
          setActiveStep(2);
          fetchEvents(); // Refresh events after minting
        },
        onCancel: () => {
          console.log("sBTC mint cancelled");
          setIsProcessing(false);
        },
      });
    } catch (error) {
      console.error("BTC deposit error:", error);
      setIsProcessing(false);
    }
  };

  const createEvent = async () => {
    const [name, date, location, maxCapacity, stakeAmount] = [
      (document.getElementById("eventName") as HTMLInputElement)?.value,
      (document.getElementById("eventDate") as HTMLInputElement)?.value,
      (document.getElementById("eventLocation") as HTMLInputElement)?.value,
      (document.getElementById("eventCapacity") as HTMLInputElement)?.value,
      (document.getElementById("stakeAmount") as HTMLInputElement)?.value,
    ];
  
    if (!name || !date || !location || !maxCapacity || !stakeAmount) {
      alert("Please fill all fields");
      return;
    }
  
    setIsProcessing(true);
    try {
      const eventDate = Math.floor(new Date(date).getTime() / 1000); // Unix timestamp
      const maxCap = parseInt(maxCapacity);
      const stakeAmt = Math.floor(parseFloat(stakeAmount) * 100000000); // Convert to sats
  
      await openContractCall({
        network: "devnet",
        contractAddress: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
        contractName: "event",
        functionName: "create-event",
        functionArgs: [
          stringAsciiCV(name),
          uintCV(eventDate),
          stringAsciiCV(location),
          uintCV(maxCap),
          uintCV(stakeAmt),
        ],
        postConditionMode: PostConditionMode.Allow,
        onFinish: (result) => {
          console.log("Create Event Transaction ID:", result);
          setIsProcessing(false);
          setActiveStep(3);
          fetchEvents(); // Refresh events after creation
        },
        onCancel: () => {
          console.log("Create Event Transaction cancelled");
          setIsProcessing(false);
        },
      });
    } catch (error) {
      console.error("Event creation error:", error);
      alert("Failed to create event. Please try again.");
      setIsProcessing(false);
    }
  };
  

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-4">
      {walletConnected && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={disconnectWallet}
            className="text-sm"
          >
            Disconnect Wallet
          </Button>
        </div>
      )}

      {/* Progress Steps */}
      <div className="flex justify-between mb-8">
        {[
          { title: "Connect Wallet", icon: Wallet },
          { title: "Deposit BTC", icon: Bitcoin },
          { title: "Create Event", icon: Calendar },
          { title: "Complete", icon: RefreshCw },
        ].map((step, index) => (
          <div
            key={step.title}
            className={`flex flex-col items-center space-y-2 ${
              index <= activeStep ? "text-blue-600" : "text-gray-400"
            }`}
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                index <= activeStep ? "bg-blue-100" : "bg-gray-100"
              }`}
            >
              <step.icon className="w-5 h-5" />
            </div>
            <span className="text-sm">{step.title}</span>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle>
            {activeStep === 0 && "Connect Your Wallet"}
            {activeStep === 1 && "Deposit BTC"}
            {activeStep === 2 && "Create Event"}
            {activeStep === 3 && "Event Created!"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeStep === 0 && (
            <Button onClick={connectWallet} className="w-full">
              Connect Leather Wallet
            </Button>
          )}

          {activeStep === 1 && (
            <>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    BTC Amount to Deposit
                  </label>
                  <Input
                    type="number"
                    value={btcAmount}
                    onChange={(e) => setBtcAmount(e.target.value)}
                    placeholder="0.0"
                    step="0.00001"
                  />
                </div>
                <Button
                  onClick={handleBTCDeposit}
                  className="w-full"
                  disabled={isProcessing}
                >
                  {isProcessing ? "Processing..." : "Deposit BTC"}
                </Button>
              </div>
            </>
          )}

          {activeStep === 2 && (
            <>
              <Alert>
                <AlertDescription>
                  {btcAmount} BTC successfully converted to sBTC!
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Event Name
                  </label>
                  <Input
                    id="eventName"
                    type="text"
                    placeholder="Enter event name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Event Date
                  </label>
                  <Input
                    id="eventDate"
                    type="date"
                    placeholder="Select event date"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Location
                  </label>
                  <Input
                    id="eventLocation"
                    type="text"
                    placeholder="Enter event location"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Maximum Capacity
                  </label>
                  <Input
                    id="eventCapacity"
                    type="number"
                    placeholder="Enter maximum number of participants"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Stake Amount (sBTC)
                  </label>
                  <Input
                    id="stakeAmount"
                    type="number"
                    placeholder="Enter stake amount in sBTC"
                    step="0.00000001"
                  />
                </div>

                <Button
                  onClick={createEvent}
                  className="w-full"
                  disabled={isProcessing}
                >
                  {isProcessing ? "Creating Event..." : "Create Event"}
                </Button>
              </div>
            </>
          )}

          {activeStep === 3 && (
            <div className="space-y-4">
              <Alert>
                <AlertDescription>
                  Event created successfully!
                </AlertDescription>
              </Alert>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium mb-2">Event Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Name:</span>
                    <span>Sample Event</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date:</span>
                    <span>2024-12-31</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Location:</span>
                    <span>Sample Location</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Capacity:</span>
                    <span>100 Participants</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Stake Amount:</span>
                    <span>1 sBTC</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span className="text-green-600">Active</span>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => {
                  setActiveStep(1);
                  setBtcAmount("");
                }}
                className="w-full"
              >
                Create Another Event
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Events List */}
      {events.length > 0 && (
        <div className="space-y-6">
          {events.map((event) => (
            <Card key={event.id}>
              <CardHeader>
                <CardTitle>{event.name}</CardTitle>
                <div className="text-sm text-gray-500">
                  {new Date(event.date * 1000).toLocaleDateString()} @ {event.location}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Organizer:</span>
                    <span className="truncate ml-2">{event.organizer}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Capacity:</span>
                    <span>{event.participants.length} / {event.maxCapacity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Stake:</span>
                    <span>{(event.stakeAmount / 100000000).toFixed(8)} sBTC</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span className={event.status === "active" ? "text-green-600" : "text-red-600"}>
                      {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                    </span>
                  </div>
                </div>

                {/* Register Button */}
                {event.status === "active" && (
                  <Button
                    onClick={() => {
                      // Implement registration logic here
                      openContractCall({
                        network: "devnet",
                        contractAddress: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
                        contractName: "payment-stream",
                        functionName: "register-and-stake",
                        functionArgs: [uintCV(event.id)],
                        postConditionMode: PostConditionMode.Allow,
                        onFinish: (result) => {
                          console.log("Register and Stake Transaction ID:", result);
                          fetchEvents(); // Refresh events after registration
                        },
                        onCancel: () => {
                          console.log("Register and Stake Transaction cancelled");
                        },
                      });
                    }}
                    className="mt-4 w-full"
                  >
                    Register & Stake
                  </Button>
                )}

                {/* Event Details and Actions */}
                <EventDetails event={event} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default PaymentStreamUI;
