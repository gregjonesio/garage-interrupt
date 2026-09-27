// The inference contract: everything about a call to Jev that is the same for
// every vehicle and notice. What differs per call is covered by the vehicle
// hash and the event hash. Scripts and build only.
import { hashOf } from "./hash";
import { JEV_MODEL, QUESTIONS, STATE_SHAPE } from "./schema";

export const CONTRACT = hashOf({ model: JEV_MODEL, questions: QUESTIONS, stateShape: STATE_SHAPE });
