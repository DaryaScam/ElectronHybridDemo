'use client'

import {
  ChevronLeftIcon,
} from '@heroicons/react/24/outline'
import { ChevronRightIcon, MagnifyingGlassIcon } from '@heroicons/react/20/solid'

const chats = [
  { name: 'Jane Doe', href: '#',  message: "Hey, how are you?" },
  { name: 'Mark Cucumberg', href: '#', message: "Your pet lizard is very cute?"  },
]

const messages = [
    {
        id: 1,
        href: '#',
        side: 'left',
        message: 'Hey, how are you?',
        date: '1h',
        dateTime: '2023-01-23T11:00',
    },
    {
        id: 2,
        href: '#',
        side: 'right',
        message: 'I am good, thank you!',
        date: '1h',
        dateTime: '2023-01-23T11:01',
    },
    {
        id: 3,
        href: '#',
        side: 'left',
        message: 'Would you like to catch a dinner next week?',
        date: '1h',
        dateTime: '2023-01-23T11:02',
    },
    {
        id: 4,
        href: '#',
        side: 'right',
        message: 'Need to check. Will let you know.',
        date: '1h',
        dateTime: '2023-01-23T11:03',
    },
]


const classNames = (...classes) => {
  return classes.filter(Boolean).join(' ')
}

const reset = () => {
  window.localStorage.removeItem("access_token");
  window.location.href = "/";
}

export default function Messages() {

  if (window.localStorage.getItem("access_token") === null) {
    window.location.href = "/";
  }
    
  return (
    <>
      {/*
        This example requires updating your template:

        ```
        <html class="h-full bg-gray-900">
        <body class="h-full">
        ```
      */}
      <div>
        {/* Static sidebar for desktop */}
        <div className="hidden xl:fixed xl:inset-y-0 xl:z-50 xl:flex xl:w-72 xl:flex-col">
          {/* Sidebar component, swap this element with another sidebar if you like */}
          <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-black/10 px-6 ring-1 ring-white/5">
            <div className="flex h-16 shrink-0 items-center">
              <img
                alt="Your Company"
                src="https://tailwindui.com/plus/img/logos/mark.svg?color=indigo&shade=500"
                className="h-8 w-auto"
              />
            </div>
            <nav className="flex flex-1 flex-col">
              <ul role="list" className="flex flex-1 flex-col gap-y-7">
                <li>
                  <ul role="list" className="-mx-2 space-y-1">
                    {chats.map((item) => (
                      <li key={item.name}>
                        <a
                          href={item.href}
                          className={classNames(
                            'bg-gray-800 text-white',
                            'group flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold',
                          )}
                        >

                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-700 text-white">
                                {item.name.split(' ').map((n) => n[0]).join('')}
                            </span>
                            <span className='pt-2'>{item.name}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </li>
                
                <li className="-mx-6 mt-auto">
                  <a
                    href="#"
                    className="flex items-center gap-x-4 px-6 py-3 text-sm/6 font-semibold text-white hover:bg-gray-800"
                    onClick={reset}
                  >
                    <img
                      alt=""
                      src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                      className="size-8 rounded-full bg-gray-800"
                    />
                    <span className="sr-only">Your profile</span>
                    <span aria-hidden="true">John Doe</span>
                    <span>Press to reset</span>
                  </a>
                </li>
              </ul>
            </nav>
          </div>
        </div>

        <div className="xl:pl-72">
          {/* Sticky search header */}
          <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-6 border-b border-white/5 bg-gray-900 px-4 shadow-sm sm:px-6 lg:px-8">
            <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
              <form action="#" method="GET" className="grid flex-1 grid-cols-1">
                <input
                  name="search"
                  type="search"
                  placeholder="Search"
                  aria-label="Search"
                  className="col-start-1 row-start-1 block size-full bg-transparent pl-8 text-base text-white outline-none placeholder:text-gray-500 sm:text-sm/6"
                />
                <MagnifyingGlassIcon
                  aria-hidden="true"
                  className="pointer-events-none col-start-1 row-start-1 size-5 self-center text-gray-500"
                />
              </form>
            </div>
          </div>

          <main className="">
            <header className="flex items-center justify-between border-b border-white/5 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
              <h1 className="text-base/89 font-semibold text-white">Jane Doe +1 (432) 555-0132</h1>
              <h2>Last seen: Today at 12:32pm</h2>
            </header>

            {/* Message list */}
            <ul role="list" className="divide-y divide-white/5">
              {messages.map((message) => (
                <li key={message.id} className={`relative flex items-center space-x-4 px-4 py-4 sm:px-6 lg:px-8 ${message.side === 'right' ? 'justify-end' : ''}`}>
                  {message.side === 'right' && <ChevronLeftIcon aria-hidden="true" className="size-5 flex-none text-gray-400" />}

                  <div className={`min-w-0 flex-auto p-4 max-w-96 rounded-xl ${message.side === 'right' ? 'bg-green-500' : 'bg-blue-500'}`}>
                    <div className="flex items-center gap-x-2.5 text-base text-white">
                      <p className="truncate">{message.message}</p>
                      <svg viewBox="0 0 2 2" className="size-0.5 flex-none fill-gray-300">
                        <circle r={1} cx={1} cy={1} />
                      </svg>
                      <p className="whitespace-nowrap">{message.date}</p>
                    </div>
                  </div>

                  {message.side === 'left' && <ChevronRightIcon aria-hidden="true" className="size-5 flex-none text-gray-400" />}
                </li>
              ))}
            </ul>
          </main>
        </div>
      </div>
    </>
  )
}
