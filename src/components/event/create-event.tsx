"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bitcoin, ArrowRight, Calendar } from "lucide-react";
import { openContractCall } from "@stacks/connect";
import { userSession } from "@/lib/userSession";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  uintCV,
  principalCV,
  stringAsciiCV,
  PostConditionMode,
} from "@stacks/transactions";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Label } from "../ui/label";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";

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

interface Participant {
  id: number;
  name: string;
  wallet: string;
}

const AttendanceSchema = z.object({
  items: z.array(z.number()).refine((value) => value.some((item) => item), {
    message: "You have to select at least one item",
  }),
});

const CreateEvent = () => {
  const { toast } = useToast();
  const [walletConnected, setWalletConnected] = useState(false);
  const [btcAmount, setBtcAmount] = useState("");
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [maxCapacity, setMaxCapacity] = useState(0);
  const [stakeAmount, setStakeAmount] = useState(0);
  const [streamDuration, setStreamDuration] = useState("2");
  const [activeStep, setActiveStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [participantId, setParticipantId] = useState(1);
  const [participantName, setParticipantName] = useState("");
  const [participantWallet, setParticipantWallet] = useState("");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof AttendanceSchema>>({
    resolver: zodResolver(AttendanceSchema),
    defaultValues: {
      items: [], // Initialize with an empty selection
    },
  });

  function refund(data: z.infer<typeof AttendanceSchema>) {
    const remainingParticipants = participants.filter(
      (participant) => !data.items.includes(participant.id)
    );
    setParticipants(remainingParticipants);
    toast({
      title: "The organizer refunded the stake",
    });
  }

  useEffect(() => {
    if (userSession.isUserSignedIn()) {
      setWalletConnected(true);
      setActiveStep(0);
    }
  }, []);

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

  const handleAddParticipant = () => {
    if (participantName == "" || participantWallet == "") {
      toast({
        title: "Uh oh! Something went wrong.",
        description: "All fields must be filled!",
      });
    } else {
      const newParticipant: Participant = {
        id: participantId,
        name: participantName,
        wallet: participantWallet,
      };
      toast({
        title: "Participant successfully added!",
        description: `${participantName} will be attending ${name}`,
      });
      setParticipants([...participants, newParticipant]);
      setParticipantName("");
      setParticipantWallet("");
      setParticipantId(participantId + 1);
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
          principalCV(
            userSession.loadUserData().profile.stxAddress.mainnet ||
              "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
          ), // recipient
        ],
        postConditionMode: PostConditionMode.Allow,
        onFinish: (result) => {
          console.log("sBTC mint transaction:", result);
          setIsProcessing(false);
          setActiveStep(2);
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
    if (!name || !date || !location || !maxCapacity || !stakeAmount) {
      alert("Please fill all fields");
      return;
    }

    setIsProcessing(true);
    try {
      const eventDate = Math.floor(new Date(date).getTime() / 1000); // Unix timestamp
      const maxCap = maxCapacity;
      const stakeAmt = stakeAmount; // Convert to sats

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
    <div className="max-w-2xl mx-auto space-y-6 p-4 mt-16">
      {/* Progress Steps */}
      <div className="flex justify-between mb-8">
        {[
          { title: "Deposit BTC", icon: Bitcoin },
          { title: "Create Event", icon: Calendar },
          { title: "Complete", icon: ArrowRight },
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
            {activeStep === 0 && "Deposit BTC"}
            {activeStep === 1 && "Create Event"}
            {activeStep === 2 && "Event Created!"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeStep === 0 && (
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

          {activeStep === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Event name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Location
                </label>
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Event location"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Date</label>
                <Input
                  value={date}
                  type="date"
                  onChange={(e) => setDate(e.target.value)}
                  placeholder="Event date"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Max capacity
                </label>
                <Input
                  type="number"
                  value={maxCapacity}
                  onChange={(e) => setMaxCapacity(e.target.valueAsNumber)}
                  placeholder="Maximum participants"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Stake Amount
                </label>
                <Input
                  type="number"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.valueAsNumber)}
                  placeholder="Amount of stake to join"
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
          )}

          {activeStep === 2 && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium mb-2">{name}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Capacity:</span>
                    <span>{maxCapacity} people</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Stake Amount:</span>
                    <span>{stakeAmount} BTC</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date:</span>
                    <span>{date}</span>
                  </div>

                  <div className="flex justify-between">
                    <span>Location:</span>
                    <span>{location}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span className="text-green-600">Open</span>
                  </div>
                </div>
              </div>

              <Dialog>
                <DialogTrigger asChild>
                  <Button className="w-full" variant="default">
                    Stake
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Participant</DialogTitle>
                    <DialogDescription>
                      Enter your information to stake and participate in this
                      event.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="name" className="text-right">
                        Name
                      </Label>
                      <Input
                        id="name"
                        placeholder="John Doe"
                        onChange={(e) => setParticipantName(e.target.value)}
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="wallet" className="text-right">
                        Wallet
                      </Label>
                      <Input
                        id="wallet"
                        placeholder="tb1q0m3d9wpsm5dn50q6v"
                        onChange={(e) => setParticipantWallet(e.target.value)}
                        className="col-span-3"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button
                        onClick={(e) => {
                          handleAddParticipant();
                        }}
                      >
                        Submit
                      </Button>
                    </DialogClose>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              {/* <Button
                onClick={() => {
                  setActiveStep(1);
                  setBtcAmount("");
                  setStreamDuration("");
                }}
                className="w-full"
              >
                Stake
              </Button> */}
              {participants.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Participants</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <Form {...form}>
                        <form
                          onSubmit={form.handleSubmit(refund)}
                          className="space-y-8"
                        >
                          <FormField
                            control={form.control}
                            name="items"
                            render={() => (
                              <FormItem>
                                {participants.map((participant) => (
                                  <FormField
                                    key={participant.id}
                                    control={form.control}
                                    name="items"
                                    render={({ field }) => {
                                      return (
                                        <FormItem
                                          key={participant.id}
                                          className="border rounded-lg p-4"
                                        >
                                          <div className="flex justify-between items-center p-2">
                                            <FormLabel className="font-normal">
                                              {participant.name}
                                            </FormLabel>
                                            <FormControl>
                                              <Checkbox
                                                checked={field.value?.includes(
                                                  participant.id
                                                )}
                                                onCheckedChange={(checked) => {
                                                  return checked
                                                    ? field.onChange([
                                                        ...field.value,
                                                        participant.id,
                                                      ])
                                                    : field.onChange(
                                                        field.value?.filter(
                                                          (value: any) =>
                                                            value !==
                                                            participant.id
                                                        )
                                                      );
                                                }}
                                              />
                                            </FormControl>
                                          </div>
                                        </FormItem>
                                      );
                                    }}
                                  />
                                ))}
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <Button className="w-full" type="submit">
                            Refund
                          </Button>
                        </form>
                      </Form>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Participants</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div className="border rounded-lg p-4">
                        <div className="flex justify-between items-center p-2">
                          No participants
                        </div>
                      </div>
                      <Button className="w-full" disabled type="submit">
                        Refund
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateEvent;
