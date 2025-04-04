import { NextRequest, NextResponse } from "next/server";
import {
  verifyCloudProof,
  IVerifyResponse,
  ISuccessResult,
} from "@worldcoin/minikit-js";

interface IRequestPayload {
  payload: ISuccessResult;
  action: string;
  signal: string | undefined;
  params: any;
}

export async function POST(req: NextRequest) {
  const { payload, action, signal, params } =
    (await req.json()) as IRequestPayload;
  const app_id = process.env.APP_ID as `app_${string}`;
  console.log("Signal", signal);
  console.log({
    app_id,
    payload,
    action,
    signal,
    params,
  });
  return NextResponse.json({
    success: {
      app_id,
      payload,
      action,
      signal,
    },
    status: 200,
  });

  //   const verifyRes = (await verifyCloudProof(
  //     payload,
  //     app_id,
  //     action,
  //     signal
  //   )) as IVerifyResponse; // Wrapper on this
  //   console.log("Verify res");
  //   console.log(verifyRes);
  //   if (verifyRes.success) {
  //     // This is where you should perform backend actions if the verification succeeds
  //     // Such as, setting a user as "verified" in a database
  //     return NextResponse.json({ success: verifyRes.success, status: 200 });
  //   } else {
  //     // This is where you should handle errors from the World ID /verify endpoint.
  //     // Usually these errors are due to a user having already verified.
  //     return NextResponse.json({ success: false, status: 400 });
  //   }
}
