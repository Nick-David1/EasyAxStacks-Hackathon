"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { showConnect } from "@stacks/connect";
import { userSession } from "@/lib/userSession";
import { useRouter } from "next/navigation";
import Image from "next/image";
import logo from "%/lockedincolored.png";

const Login = () => {
  const router = useRouter();
  const [walletConnected, setWalletConnected] = useState(false);

  useEffect(() => {
    if (userSession.isUserSignedIn()) {
      setWalletConnected(true);
      router.push("/events");
    }
  }, [router]);

  const connectWallet = async () => {
    try {
      showConnect({
        userSession,
        appDetails: {
          name: "BTC Payment Stream",
          icon: window.location.origin + "/favicon.ico",
        },
        onFinish: () => {
          setWalletConnected(true);
          router.push("/dashboard");
        },
        onCancel: () => {
          console.log("Wallet connection cancelled");
        },
      });
    } catch (error) {
      console.error("Wallet connection error:", error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <Image src={logo} alt={"Logo"} height={50} />
      <Button onClick={connectWallet} variant="outline">
        Connect Leather Wallet
      </Button>
    </div>
  );
};

export default Login;
