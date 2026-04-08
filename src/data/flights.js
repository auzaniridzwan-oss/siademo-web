/** Fare order: Lite, Value, Standard, Flexi */
export const FARE_BUCKETS = ['Lite', 'Value', 'Standard', 'Flexi'];

export const DESTINATION_OPTIONS = [
  { label: 'Tokyo (NRT)', code: 'NRT' },
  { label: 'London (LHR)', code: 'LHR' },
  { label: 'Sydney (SYD)', code: 'SYD' },
];

/** @type {Record<string, Array<{ id: string, flightNumber: string, departureTime: string, arrivalTime: string, duration: string, prices: (number|null)[], originAirportName: string, destinationAirportName: string, aircraft: string, arrivalDayOffset: number }>>} */
export const FLIGHT_DATA = {
  NRT: [
    {
      id: 'SQ1',
      flightNumber: 'SQ1',
      departureTime: '00:50',
      arrivalTime: '08:55',
      duration: '8h 5m',
      prices: [null, 1070.9, 1260.9, 1590.9],
      originAirportName: 'Singapore Changi Airport',
      destinationAirportName: 'Narita International Airport',
      aircraft: 'Airbus A350-900',
      arrivalDayOffset: 0,
    },
    {
      id: 'SQ638',
      flightNumber: 'SQ638',
      departureTime: '23:55',
      arrivalTime: '08:00',
      duration: '8h 5m',
      prices: [null, null, 1250.9, 1590.9],
      originAirportName: 'Singapore Changi Airport',
      destinationAirportName: 'Narita International Airport',
      aircraft: 'Boeing 787-10',
      arrivalDayOffset: 1,
    },
  ],
  LHR: [
    {
      id: 'SQ308',
      flightNumber: 'SQ308',
      departureTime: '09:00',
      arrivalTime: '15:40',
      duration: '14h 40m',
      prices: [950.0, 1100.0, 1400.0, 1800.0],
      originAirportName: 'Singapore Changi Airport',
      destinationAirportName: 'London Heathrow Airport',
      aircraft: 'Airbus A380-800',
      arrivalDayOffset: 0,
    },
  ],
  SYD: [
    {
      id: 'SQ231',
      flightNumber: 'SQ231',
      departureTime: '00:45',
      arrivalTime: '11:50',
      duration: '8h 5m',
      prices: [750.0, 890.0, 1100.0, 1350.0],
      originAirportName: 'Singapore Changi Airport',
      destinationAirportName: 'Sydney Kingsford Smith Airport',
      aircraft: 'Airbus A350-900',
      arrivalDayOffset: 0,
    },
  ],
};
