import { StubMission } from "Missions/Implementations/StubMission";

export default {
  enabled: false,
  missions: {
    QuadAttackMission: class QuadAttackMission extends StubMission {}
  }
};
