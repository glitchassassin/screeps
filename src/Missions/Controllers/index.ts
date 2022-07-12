import AcquireDispatcher from "./Acquire";
import DefenseDispatcher from "./Defense";
import EngineerDispatcher from "./Engineer";
import ExploreDispatcher from "./Explore";
import HarvestDispatcher from "./Harvest";
import HeadquartersDispatcher from "./Headquarters";
import LogisticsDispatcher from "./Logistics";
import MineDispatcher from "./Mine";
import RefillDispatcher from "./Refill";
import ReserveDispatcher from "./Reserve";
import ScienceDispatcher from "./Science";
import UpgradeDispatcher from "./Upgrade";

export const Dispatchers = [
  HarvestDispatcher,
  LogisticsDispatcher,
  ExploreDispatcher,
  EngineerDispatcher,
  RefillDispatcher,
  UpgradeDispatcher,
  ReserveDispatcher,
  HeadquartersDispatcher,
  MineDispatcher,
  ScienceDispatcher,
  AcquireDispatcher,
  DefenseDispatcher
]
