;; Error codes
(define-constant ERR_UNAUTHORIZED u0)
(define-constant ERR_INVALID_SIGNATURE u1)
(define-constant ERR_STREAM_STILL_ACTIVE u2)
(define-constant ERR_INVALID_STREAM_ID u3)
(define-constant ERR_INVALID_EVENT u100) ;; Invalid event ID
(define-constant ERR_EVENT_FULL u101) ;; Event has reached max capacity
(define-constant ERR_ALREADY_REGISTERED u102) ;; Participant already registered
(define-constant ERR_UNREGISTERED_PARTICIPANT u103) ;; Participant not registered
(define-constant ERR_ALREADY_MARKED u104) ;; Attendance already marked
(define-constant ERR_ALREADY_REFUNDED u105) ;; Attempting to refund again
(define-constant ERR_INSUFFICIENT_BALANCE u106) ;; Insufficient balance for refund

(define-constant MAX_EVENT_CAPACITY u1000) ;; Adjust as needed

;; Data vars
(define-data-var latest-event-id uint u0) ;; New data var for events

;; Events mapping
(define-map events
    uint ;; event-id
    {
        organizer: principal, ;; Event organizer
        name: (string-ascii 100),
        date: uint, ;; Unix timestamp or block height representing the event date
        location: (string-ascii 100),
        max-capacity: uint,
        stake-amount: uint ;; Amount of sBTC required to stake
    }
)

;; Participant count per event
(define-map event-participant-count
    uint ;; event-id
    uint ;; participant count
)

;; Participants mapping
(define-map participants
    {event-id: uint, index: uint}
    principal
)

;; Stakes mapping
(define-map stakes
    {event-id: uint, participant: principal}
    uint ;; stake amount
)

;; Attendance mapping
(define-map attendance
    {event-id: uint, participant: principal}
    bool ;; attendance status
)

;; Refunded mapping
(define-map refunded
    {event-id: uint, participant: principal}
    bool ;; refunded status
)

(define-public (create-event
    (name (string-ascii 100)) ;; Name of the event
    (date uint) ;; Date of the event as Unix timestamp or block height
    (location (string-ascii 100)) ;; Location of the event
    (max-capacity uint) ;; Maximum number of participants
    (stake-amount uint) ;; Amount of sBTC required to stake
)
    (let (
        (event-id (var-get latest-event-id))
        (event (tuple
            (organizer tx-sender)
            (name name)
            (date date)
            (location location)
            (max-capacity max-capacity)
            (stake-amount stake-amount)
        ))
    )
        (map-set events event-id event) ;; Store the new event
        (var-set latest-event-id (+ event-id u1)) ;; Increment the event ID
        (ok event-id) ;; Return the new event ID
    )
)

(define-public (register-and-stake
    (event-id uint)
)
    (let (
        (event-opt (map-get? events event-id))
        (participant tx-sender)
    )
        (match event-opt
            event
            (let (
                (current-count (default-to u0 (map-get? event-participant-count event-id)))
                (max-capacity (get max-capacity event))
                (stake-amount (get stake-amount event))
            )
                ;; Check if the event has reached its maximum capacity
                (asserts! (< current-count max-capacity) (err ERR_EVENT_FULL))
                
                ;; Check if the participant is already registered
                (asserts! (is-none (map-get? stakes {event-id: event-id, participant: participant})) (err ERR_ALREADY_REGISTERED))
                
                ;; Transfer sBTC from participant to the contract
                (try! (contract-call? .sbtc-token transfer
                    stake-amount
                    participant ;; sender
                    (as-contract tx-sender) ;; recipient (this contract)
                    none ;; memo
                ))
                
                ;; Update participant count
                (map-set event-participant-count event-id (+ current-count u1))
                
                ;; Add participant to 'participants' map
                (map-set participants {event-id: event-id, index: current-count} participant)
                
                ;; Record stake
                (map-set stakes {event-id: event-id, participant: participant} stake-amount)
                (ok true)
            )
            (err ERR_INVALID_EVENT)
        )
    )
)

(define-public (mark-attendance
    (event-id uint)
    (participant principal)
    (attended bool)
)
    (let (
        (event-opt (map-get? events event-id))
    )
        (match event-opt
            event
            (let (
                (organizer (get organizer event))
            )
                ;; Ensure only the organizer can mark attendance
                (asserts! (is-eq tx-sender organizer) (err ERR_UNAUTHORIZED))
                
                ;; Ensure the participant is registered
                (asserts! (is-some (map-get? stakes {event-id: event-id, participant: participant})) (err ERR_UNREGISTERED_PARTICIPANT))
                
                ;; Prevent double marking
                (asserts! (is-none (map-get? attendance {event-id: event-id, participant: participant})) (err ERR_ALREADY_MARKED))
                
                ;; Update attendance status
                (map-set attendance {event-id: event-id, participant: participant} attended)
                (ok true)
            )
            (err ERR_INVALID_EVENT)
        )
    )
)

(define-public (refund
    (event-id uint)
)
    (let (
        (event-opt (map-get? events event-id))
        (participant tx-sender)
    )
        (match event-opt
            event
            (let (
                (attended-opt (map-get? attendance {event-id: event-id, participant: participant}))
                (refunded-opt (map-get? refunded {event-id: event-id, participant: participant}))
                (stake-opt (map-get? stakes {event-id: event-id, participant: participant}))
            )
                ;; Ensure the participant is registered
                (asserts! (is-some stake-opt) (err ERR_UNREGISTERED_PARTICIPANT))
                
                ;; Ensure attendance was marked
                (asserts! (is-some attended-opt) (err ERR_ALREADY_MARKED)) ;; Attendance was not marked yet
                
                ;; Ensure the participant attended the event
                (asserts! (is-eq (unwrap! attended-opt (err ERR_UNAUTHORIZED)) true) (err ERR_UNAUTHORIZED))
                
                ;; Ensure the participant hasn't already been refunded
                (asserts! (is-none refunded-opt) (err ERR_ALREADY_REFUNDED))
                
                ;; Transfer the stake back to the participant
                (try! (contract-call? .sbtc-token transfer
                    (unwrap! stake-opt (err ERR_INSUFFICIENT_BALANCE))
                    (as-contract tx-sender) ;; sender (contract)
                    participant ;; recipient
                    none ;; memo
                ))
                
                ;; Update the refunded map
                (map-set refunded {event-id: event-id, participant: participant} true)
                (ok true)
            )
            (err ERR_INVALID_EVENT)
        )
    )
)
